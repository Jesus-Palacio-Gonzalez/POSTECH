import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { cantidad, cop } from '../../lib/formato'
import { etiquetaMetodo } from '../../lib/ventas'
import type { MetodoPago } from '../../lib/ventas'
import { mensajeFuncion, supabase } from '../../lib/supabase'

type Periodo = 'hoy' | '7' | '30' | 'mes'
const periodos: Array<{ id: Periodo; texto: string }> = [
  { id: 'hoy', texto: 'Hoy' },
  { id: '7', texto: '7 días' },
  { id: '30', texto: '30 días' },
  { id: 'mes', texto: 'Este mes' },
]

interface Venta { id: string; numero: number | null; created_at: string; metodo_pago: MetodoPago; total: number | string; impuesto: number | string }
interface Item { descripcion: string; cantidad: number | string; costo_unitario: number | string; total: number | string; ventas: { estado: string } | { estado: string }[] | null }
interface Orden { estado: string; perfiles: { nombre_completo: string } | { nombre_completo: string }[] | null }

function desde(p: Periodo): Date {
  const h = new Date()
  const base = new Date(h.getFullYear(), h.getMonth(), h.getDate())
  if (p === 'mes') return new Date(h.getFullYear(), h.getMonth(), 1)
  if (p === 'hoy') return base
  base.setDate(base.getDate() - (Number(p) - 1))
  return base
}

function descargarCsv(ventas: Venta[]) {
  const filas = [['Numero', 'Fecha', 'Metodo', 'IVA incluido', 'Total'], ...ventas.map((v) => [v.numero ?? '', v.created_at, v.metodo_pago, v.impuesto, v.total])]
  const csv = '﻿' + filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = 'ventas.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function Reportes() {
  const [periodo, setPeriodo] = useState<Periodo>('7')
  const [ventas, setVentas] = useState<Venta[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [inv, setInv] = useState({ costo: 0, venta: 0, productos: 0 })
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async (p: Periodo) => {
    setCargando(true)
    const ini = desde(p).toISOString()
    const [v, i, o, pr] = await Promise.all([
      supabase.from('ventas').select('id, numero, created_at, metodo_pago, total, impuesto').eq('estado', 'completada').gte('created_at', ini).order('created_at').limit(5000),
      supabase.from('venta_items').select('descripcion, cantidad, costo_unitario, total, ventas!inner ( estado, created_at )').eq('ventas.estado', 'completada').gte('ventas.created_at', ini).limit(20000),
      supabase.from('ordenes_taller').select('estado, perfiles:mecanico_id ( nombre_completo )').gte('fecha_ingreso', ini).limit(5000),
      supabase.from('productos').select('stock_actual, precio_costo, precio_venta').eq('activo', true).eq('es_servicio', false).limit(20000),
    ])
    const fallo = v.error ?? i.error ?? o.error ?? pr.error
    setError(fallo ? mensajeFuncion(fallo) : null)
    setVentas((v.data ?? []) as Venta[])
    setItems((i.data ?? []) as unknown as Item[])
    setOrdenes((o.data ?? []) as unknown as Orden[])
    const prods = (pr.data ?? []) as Array<{ stock_actual: number | string; precio_costo: number | string; precio_venta: number | string }>
    setInv({
      productos: prods.length,
      costo: prods.reduce((a, x) => a + Math.max(0, Number(x.stock_actual)) * Number(x.precio_costo), 0),
      venta: prods.reduce((a, x) => a + Math.max(0, Number(x.stock_actual)) * Number(x.precio_venta), 0),
    })
    setCargando(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar(periodo)
  }, [cargar, periodo])

  const r = useMemo(() => {
    const total = ventas.reduce((a, v) => a + Number(v.total), 0)
    const iva = ventas.reduce((a, v) => a + Number(v.impuesto), 0)
    const costo = items.reduce((a, x) => a + Number(x.cantidad) * Number(x.costo_unitario), 0)
    const porDia = new Map<string, number>()
    ventas.forEach((v) => {
      const d = v.created_at.slice(0, 10)
      porDia.set(d, (porDia.get(d) ?? 0) + Number(v.total))
    })
    const porMetodo = new Map<string, number>()
    ventas.forEach((v) => porMetodo.set(v.metodo_pago, (porMetodo.get(v.metodo_pago) ?? 0) + Number(v.total)))
    const prod = new Map<string, { uds: number; total: number }>()
    items.forEach((x) => {
      const a = prod.get(x.descripcion) ?? { uds: 0, total: 0 }
      prod.set(x.descripcion, { uds: a.uds + Number(x.cantidad), total: a.total + Number(x.total) })
    })
    const mec = new Map<string, number>()
    ordenes.forEach((o) => {
      const n = (Array.isArray(o.perfiles) ? o.perfiles[0]?.nombre_completo : o.perfiles?.nombre_completo) ?? 'Sin asignar'
      mec.set(n, (mec.get(n) ?? 0) + 1)
    })
    return {
      total, iva, costo, utilidad: total - iva - costo,
      dias: [...porDia.entries()].sort(),
      metodos: [...porMetodo.entries()].sort((a, b) => b[1] - a[1]),
      top: [...prod.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 10),
      mecanicos: [...mec.entries()].sort((a, b) => b[1] - a[1]),
      entregadas: ordenes.filter((o) => o.estado === 'entregada').length,
    }
  }, [ventas, items, ordenes])

  const maxDia = Math.max(1, ...r.dias.map(([, t]) => t))
  const kpis = [
    { l: 'Ventas', v: cop.format(r.total) },
    { l: 'N.º de ventas', v: String(ventas.length) },
    { l: 'Ticket promedio', v: cop.format(ventas.length ? r.total / ventas.length : 0) },
    { l: 'IVA incluido', v: cop.format(r.iva) },
    { l: 'Utilidad bruta', v: cop.format(r.utilidad) },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl text-ink-950">Reportes</h1>
          <p className="mt-2 font-semibold text-ink-700">Ventas, productos, taller e inventario del periodo. La utilidad bruta es venta sin IVA menos costo.</p>
        </div>
        <button type="button" onClick={() => descargarCsv(ventas)} disabled={!ventas.length} className="flex items-center gap-2 border-2 border-ink-950 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide hover:bg-ink-50 disabled:opacity-50">
          <Download size={16} /> Exportar ventas (CSV)
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Periodo">
        {periodos.map((x) => (
          <button key={x.id} type="button" aria-pressed={periodo === x.id} onClick={() => setPeriodo(x.id)} className={`border-2 px-4 py-2 text-xs font-extrabold uppercase tracking-wide ${periodo === x.id ? 'border-ink-950 bg-ink-950 text-brand-500' : 'border-ink-300 bg-white hover:border-ink-950'}`}>{x.texto}</button>
        ))}
      </div>

      {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p>}

      <div className={`space-y-5 ${cargando ? 'opacity-60' : ''}`}>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores">
          {kpis.map((k) => (
            <article key={k.l} className="border-t-4 border-brand-500 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-500">{k.l}</p>
              <p className="display mt-1 text-2xl text-ink-950">{k.v}</p>
            </article>
          ))}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="bg-white p-5" aria-label="Ventas por día">
            <h2 className="display text-xl text-ink-950">Ventas por día</h2>
            {r.dias.length === 0 ? <p className="mt-3 text-sm font-semibold text-ink-500">Sin ventas en este periodo.</p> : (
              <ul className="mt-3 space-y-2">
                {r.dias.map(([d, t]) => (
                  <li key={d} className="flex items-center gap-3 text-xs font-bold text-ink-700">
                    <span className="w-20 shrink-0">{d.slice(5)}</span>
                    <span className="h-4 bg-brand-500" style={{ width: `${Math.max(2, (t / maxDia) * 100)}%`, maxWidth: 'calc(100% - 9rem)' }} />
                    <span className="ml-auto shrink-0 text-ink-950">{cop.format(t)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white p-5" aria-label="Métodos de pago">
            <h2 className="display text-xl text-ink-950">Por método de pago</h2>
            {r.metodos.length === 0 ? <p className="mt-3 text-sm font-semibold text-ink-500">Sin datos.</p> : (
              <ul className="mt-3 divide-y divide-ink-100 text-sm font-semibold">
                {r.metodos.map(([m, t]) => (
                  <li key={m} className="flex justify-between py-2"><span>{etiquetaMetodo[m as MetodoPago] ?? m}</span><span className="font-extrabold text-ink-950">{cop.format(t)}</span></li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white p-5" aria-label="Más vendidos">
            <h2 className="display text-xl text-ink-950">Más vendidos</h2>
            {r.top.length === 0 ? <p className="mt-3 text-sm font-semibold text-ink-500">Sin datos.</p> : (
              <ol className="mt-3 divide-y divide-ink-100 text-sm font-semibold">
                {r.top.map(([n, a], i) => (
                  <li key={n} className="flex items-center gap-3 py-2"><span className="w-5 text-ink-500">{i + 1}</span><span className="flex-1 truncate text-ink-950">{n}</span><span className="text-xs text-ink-500">{cantidad(a.uds)} uds</span><span className="font-extrabold text-ink-950">{cop.format(a.total)}</span></li>
                ))}
              </ol>
            )}
          </section>

          <section className="bg-white p-5" aria-label="Taller">
            <h2 className="display text-xl text-ink-950">Taller</h2>
            <p className="mt-2 text-sm font-semibold text-ink-700">{ordenes.length} órdenes ingresadas · {r.entregadas} entregadas</p>
            {r.mecanicos.length > 0 && (
              <ul className="mt-3 divide-y divide-ink-100 text-sm font-semibold">
                {r.mecanicos.map(([n, c]) => <li key={n} className="flex justify-between py-2"><span>{n}</span><span className="font-extrabold text-ink-950">{c}</span></li>)}
              </ul>
            )}
          </section>
        </div>

        <section className="grid gap-4 bg-white p-5 sm:grid-cols-3" aria-label="Inventario">
          <div><p className="text-xs font-bold uppercase tracking-widest text-ink-500">Productos con stock</p><p className="display text-2xl">{inv.productos}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-widest text-ink-500">Inventario al costo</p><p className="display text-2xl">{cop.format(inv.costo)}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-widest text-ink-500">Inventario a precio de venta</p><p className="display text-2xl">{cop.format(inv.venta)}</p></div>
        </section>
      </div>
    </div>
  )
}
