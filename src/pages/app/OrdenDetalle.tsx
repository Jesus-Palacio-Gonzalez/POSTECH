import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Trash2, Wrench } from 'lucide-react'
import { BuscadorProducto } from '../../components/BuscadorProducto'
import { ComprobanteModal } from '../../components/Comprobante'
import { OrdenModal } from '../../components/OrdenImprimible'
import { useNegocio } from '../../context/NegocioContext'
import { cantidad, cop, fechaHora } from '../../lib/formato'
import { FLUJO, cargarOrden, colorEstado, etiquetaEstado, listarMecanicos } from '../../lib/ordenes'
import type { EstadoOrden, Mecanico, OrdenCompleta } from '../../lib/ordenes'
import type { Producto } from '../../lib/productos'
import { mensajeFuncion, supabase } from '../../lib/supabase'
import { entrada } from '../../lib/ui'
import { cargarVenta, etiquetaMetodo } from '../../lib/ventas'
import type { MetodoPago, VentaCompleta } from '../../lib/ventas'

const metodos: MetodoPago[] = ['efectivo', 'tarjeta', 'transferencia', 'credito']

export default function OrdenDetalle() {
  const { id = '' } = useParams()
  const { rol } = useNegocio()
  const esMecanico = rol === 'mecanico'
  const cobra = rol === 'dueno' || rol === 'admin' || rol === 'cajero'

  const [orden, setOrden] = useState<OrdenCompleta | null>(null)
  const [stock, setStock] = useState<Map<string, number>>(new Map())
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([])
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState({ diagnostico: '', trabajo: '', notas: '', mecanico: '', estimada: '' })
  const [imprimir, setImprimir] = useState(false)
  const [venta, setVenta] = useState<VentaCompleta | null>(null)
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [abono, setAbono] = useState(0)
  const [entregando, setEntregando] = useState(false)
  const [libre, setLibre] = useState({ descripcion: '', precio: '' })

  const cargar = useCallback(async () => {
    const [o, err] = await cargarOrden(id)
    if (!o) {
      setError(err)
      setCargando(false)
      return
    }
    const ids = o.items.map((i) => i.producto_id).filter((x): x is string => !!x)
    const mapa = new Map<string, number>()
    if (ids.length) {
      const { data } = await supabase.from('productos').select('id, stock_actual').in('id', ids)
      for (const p of (data ?? []) as Array<{ id: string; stock_actual: number | string }>) mapa.set(p.id, Number(p.stock_actual))
    }
    setStock(mapa)
    setOrden(o)
    setForm({
      diagnostico: o.diagnostico ?? '',
      trabajo: o.trabajo_realizado ?? '',
      notas: o.notas ?? '',
      mecanico: o.mecanico_id ?? '',
      estimada: o.fecha_estimada ?? '',
    })
    setError(null)
    setCargando(false)
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar()
  }, [cargar])

  useEffect(() => {
    if (esMecanico) return
    void listarMecanicos().then(setMecanicos)
  }, [esMecanico])

  const abierta = orden ? !['entregada', 'cancelada'].includes(orden.estado) : false
  const totales = useMemo(() => {
    const total = orden?.items.reduce((a, i) => a + i.total, 0) ?? 0
    const iva = orden?.items.reduce((a, i) => a + (i.total - i.total / (1 + i.iva_porcentaje / 100)), 0) ?? 0
    return { total, iva }
  }, [orden])

  async function ejecutar(accion: () => PromiseLike<{ error: { message?: string; code?: string } | null }>, ok?: string) {
    setAviso(null)
    setError(null)
    const { error: err } = await accion()
    if (err) {
      setError(mensajeFuncion(err))
      return false
    }
    await cargar()
    if (ok) setAviso(ok)
    return true
  }

  const cambiarEstado = (estado: EstadoOrden) =>
    ejecutar(() => supabase.from('ordenes_taller').update({ estado }).eq('id', id), `Estado: ${etiquetaEstado[estado]}`)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const cambios: Record<string, unknown> = {
      diagnostico: form.diagnostico.trim() || null,
      trabajo_realizado: form.trabajo.trim() || null,
      notas: form.notas.trim() || null,
    }
    if (!esMecanico) {
      cambios.mecanico_id = form.mecanico || null
      cambios.fecha_estimada = form.estimada || null
    }
    await ejecutar(() => supabase.from('ordenes_taller').update(cambios).eq('id', id), 'Cambios guardados')
  }

  async function agregarProducto(p: Producto) {
    if (!orden) return
    const existente = orden.items.find((i) => i.producto_id === p.id)
    if (existente) {
      await ejecutar(() => supabase.from('orden_items').update({ cantidad: existente.cantidad + 1 }).eq('id', existente.id))
      return
    }
    await ejecutar(() =>
      supabase.from('orden_items').insert({
        orden_id: id,
        tipo: p.es_servicio ? 'mano_obra' : 'repuesto',
        producto_id: p.id,
        descripcion: p.nombre,
        cantidad: 1,
        precio_unitario: Number(p.precio_venta),
        iva_porcentaje: Number(p.iva_porcentaje),
      }),
    )
  }

  async function agregarLibre(e: FormEvent) {
    e.preventDefault()
    if (!libre.descripcion.trim() || libre.precio === '') return
    const ok = await ejecutar(() =>
      supabase.from('orden_items').insert({
        orden_id: id,
        tipo: 'mano_obra',
        descripcion: libre.descripcion.trim(),
        cantidad: 1,
        precio_unitario: Number(libre.precio),
      }),
    )
    if (ok) setLibre({ descripcion: '', precio: '' })
  }

  const cambiarItem = (itemId: string, cambio: { cantidad?: number; precio_unitario?: number }) =>
    ejecutar(() => supabase.from('orden_items').update(cambio).eq('id', itemId))
  const quitarItem = (itemId: string) => ejecutar(() => supabase.from('orden_items').delete().eq('id', itemId))

  async function entregar() {
    if (!orden) return
    setEntregando(true)
    setError(null)
    const { data, error: err } = await supabase.rpc('entregar_orden', {
      p_orden: id,
      p_metodo: metodo,
      p_pagado: metodo === 'credito' ? Math.min(Math.max(abono || 0, 0), totales.total) : null,
    })
    if (err) {
      setEntregando(false)
      setError(mensajeFuncion(err))
      return
    }
    const [v] = await cargarVenta(data as string)
    setEntregando(false)
    if (v) setVenta(v)
    await cargar()
  }

  async function verComprobante() {
    if (!orden?.venta_id) return
    const [v, err] = await cargarVenta(orden.venta_id)
    if (v) setVenta(v)
    else setError(err)
  }

  if (cargando) return <div className="py-16 text-center text-sm font-semibold text-ink-500">Cargando orden…</div>
  if (!orden) {
    return (
      <div className="mx-auto max-w-lg space-y-4 bg-white p-8 text-center">
        <p className="font-semibold text-ink-700">{error}</p>
        <Link to="/app/ordenes" className="inline-block bg-ink-950 px-5 py-2.5 text-sm font-extrabold uppercase text-white">Volver a órdenes</Link>
      </div>
    )
  }

  const idx = FLUJO.indexOf(orden.estado)
  const faltantes = orden.items.filter((i) => i.producto_id && (stock.get(i.producto_id) ?? Infinity) < i.cantidad)
  const abonoOk = Math.min(Math.max(abono || 0, 0), totales.total)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/app/ordenes" className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-500 hover:text-ink-950">
        <ArrowLeft size={14} /> Órdenes de taller
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4 bg-white p-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="display text-4xl text-ink-950">Orden #{orden.numero ?? '—'}</h1>
            <span className={`px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide ${colorEstado[orden.estado]}`}>{etiquetaEstado[orden.estado]}</span>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-sm border-2 border-ink-950 bg-amber-300 px-2 py-0.5 font-display text-xl font-extrabold tracking-wider">{orden.moto?.placa ?? '—'}</span>
            <span className="font-extrabold text-ink-950">{orden.moto?.modelo ?? 'Moto sin modelo'}</span>
            <span className="text-sm font-semibold text-ink-500">{[orden.moto?.color, orden.moto?.anio].filter(Boolean).join(' · ')}</span>
          </p>
          <p className="mt-2 text-sm font-semibold text-ink-700">
            {orden.cliente ? `${orden.cliente.nombre}${orden.cliente.telefono ? ` · ${orden.cliente.telefono}` : ''}` : 'Sin cliente'} · Ingresó {fechaHora(orden.fecha_ingreso)}
            {orden.kilometraje_entrada != null && ` · ${cantidad(orden.kilometraje_entrada)} km`}
          </p>
        </div>
        <button type="button" onClick={() => setImprimir(true)} className="flex items-center gap-2 border-2 border-ink-950 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide hover:bg-ink-100">
          <Printer size={16} /> Imprimir orden
        </button>
      </header>

      {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p>}
      {aviso && <p role="status" className="border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{aviso}</p>}

      {abierta && (
        <section className="bg-white p-6" aria-label="Estado de la orden">
          <h2 className="display text-2xl text-ink-950">Avance</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {FLUJO.map((e, i) => (
              <button
                key={e}
                type="button"
                aria-pressed={orden.estado === e}
                onClick={() => void cambiarEstado(e)}
                className={`border-2 px-3 py-3 text-xs font-extrabold uppercase tracking-wide transition ${orden.estado === e ? 'border-ink-950 bg-ink-950 text-brand-500' : i < idx ? 'border-emerald-600 text-emerald-800' : 'border-ink-300 text-ink-700 hover:border-ink-950'}`}
              >
                {i + 1}. {etiquetaEstado[e]}
              </button>
            ))}
          </div>
        </section>
      )}

      <form onSubmit={guardar} className="space-y-4 bg-white p-6" aria-label="Trabajo">
        <h2 className="display text-2xl text-ink-950">Trabajo</h2>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink-500">Problema reportado</p>
          <p className="mt-1 whitespace-pre-wrap font-semibold text-ink-950">{orden.problema_reportado}</p>
        </div>
        <fieldset disabled={!abierta} className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Diagnóstico</span>
            <textarea rows={4} value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} className={entrada} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Trabajo realizado</span>
            <textarea rows={4} value={form.trabajo} onChange={(e) => setForm({ ...form, trabajo: e.target.value })} className={entrada} />
          </label>
          {!esMecanico && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Mecánico</span>
                <select value={form.mecanico} onChange={(e) => setForm({ ...form, mecanico: e.target.value })} className={entrada}>
                  <option value="">Sin asignar</option>
                  {mecanicos.map((m) => <option key={m.id} value={m.id}>{m.nombre_completo || 'Sin nombre'}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Entrega estimada</span>
                <input type="date" value={form.estimada} onChange={(e) => setForm({ ...form, estimada: e.target.value })} className={entrada} />
              </label>
            </>
          )}
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Notas internas</span>
            <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className={entrada} />
          </label>
        </fieldset>
        {abierta && (
          <div className="flex flex-wrap gap-3">
            <button className="bg-ink-950 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white hover:bg-ink-800">Guardar cambios</button>
            {!esMecanico && (
              <button
                type="button"
                onClick={() => { if (window.confirm('¿Cancelar esta orden? No se podrá reabrir.')) void cambiarEstado('cancelada') }}
                className="border-2 border-red-600 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-red-700 hover:bg-red-50"
              >
                Cancelar orden
              </button>
            )}
          </div>
        )}
      </form>

      <section className="space-y-4 bg-white p-6" aria-label="Repuestos y mano de obra">
        <h2 className="display text-2xl text-ink-950">Repuestos y mano de obra</h2>
        {abierta && (
          <div className="grid gap-3 lg:grid-cols-2">
            <BuscadorProducto onElegir={(p) => void agregarProducto(p)} />
            <form onSubmit={agregarLibre} className="flex gap-2" aria-label="Mano de obra">
              <input required aria-label="Descripción de mano de obra" value={libre.descripcion} onChange={(e) => setLibre({ ...libre, descripcion: e.target.value })} placeholder="Mano de obra o servicio" className={entrada} />
              <input required aria-label="Valor de mano de obra" type="number" min="0" value={libre.precio} onChange={(e) => setLibre({ ...libre, precio: e.target.value })} placeholder="Valor" className={`${entrada} w-32`} />
              <button className="flex items-center gap-1.5 bg-ink-950 px-4 text-xs font-extrabold uppercase text-white"><Wrench size={14} /> Agregar</button>
            </form>
          </div>
        )}

        {orden.items.length === 0 ? (
          <p className="bg-ink-50 px-4 py-6 text-center text-sm font-semibold text-ink-500">Todavía no hay repuestos ni mano de obra en esta orden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="bg-ink-950 text-xs font-bold uppercase tracking-wider text-ink-300">
                <tr><th className="px-4 py-2.5">Detalle</th><th className="px-4 py-2.5">Cant.</th><th className="px-4 py-2.5 text-right">Precio</th><th className="px-4 py-2.5 text-right">Total</th><th className="w-10" /></tr>
              </thead>
              <tbody className="divide-y divide-ink-100 font-semibold text-ink-700">
                {orden.items.map((i) => {
                  const disp = i.producto_id ? stock.get(i.producto_id) : undefined
                  const falta = disp !== undefined && disp < i.cantidad
                  return (
                    <tr key={i.id}>
                      <td className="px-4 py-3">
                        <span className="block font-extrabold text-ink-950">{i.descripcion}</span>
                        <span className="text-xs text-ink-500">{i.tipo === 'mano_obra' ? 'Mano de obra' : 'Repuesto'}{i.iva_porcentaje > 0 ? ` · IVA ${cantidad(i.iva_porcentaje)}%` : ''}</span>
                        {falta && <span role="alert" className="block text-xs font-bold text-red-700">Solo hay {cantidad(disp!)} en stock</span>}
                      </td>
                      <td className="px-4 py-3">
                        {abierta ? (
                          <input aria-label={`Cantidad de ${i.descripcion}`} type="number" min="0.001" step="any" defaultValue={i.cantidad} key={`${i.id}-${i.cantidad}`} onBlur={(e) => { const n = Number(e.target.value); if (n > 0 && n !== i.cantidad) void cambiarItem(i.id, { cantidad: n }) }} className="w-20 border-2 border-ink-950 px-2 py-1 text-center font-bold" />
                        ) : cantidad(i.cantidad)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {abierta && !esMecanico ? (
                          <input aria-label={`Precio de ${i.descripcion}`} type="number" min="0" defaultValue={i.precio_unitario} key={`${i.id}-${i.precio_unitario}`} onBlur={(e) => { const n = Number(e.target.value); if (n >= 0 && n !== i.precio_unitario) void cambiarItem(i.id, { precio_unitario: n }) }} className="w-28 border-2 border-ink-950 px-2 py-1 text-right font-bold" />
                        ) : cop.format(i.precio_unitario)}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-ink-950">{cop.format(i.total)}</td>
                      <td className="px-2 py-3 text-right">
                        {abierta && <button type="button" aria-label={`Quitar ${i.descripcion}`} onClick={() => void quitarItem(i.id)} className="text-ink-500 hover:text-red-700"><Trash2 size={16} /></button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col items-end gap-1 border-t-2 border-ink-950 pt-3">
          {totales.iva > 0 && <p className="text-xs font-semibold text-ink-500">IVA incluido {cop.format(Math.round(totales.iva))}</p>}
          <p className="display text-3xl text-ink-950">Total {cop.format(totales.total)}</p>
        </div>
      </section>

      {orden.estado === 'lista' && cobra && (
        <section className="space-y-4 border-2 border-ink-950 bg-white p-6" aria-label="Entrega y cobro">
          <h2 className="display text-2xl text-ink-950">Entregar y cobrar</h2>
          {faltantes.length > 0 && (
            <p role="alert" className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              No hay stock suficiente de: {faltantes.map((f) => f.descripcion).join(', ')}. La entrega se bloqueará hasta que haya existencias o ajustes la cantidad.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {metodos.map((m) => (
              <button key={m} type="button" aria-pressed={metodo === m} onClick={() => setMetodo(m)} className={`border-2 px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide ${metodo === m ? 'border-ink-950 bg-ink-950 text-brand-500' : 'border-ink-300 hover:border-ink-950'}`}>
                {etiquetaMetodo[m]}
              </button>
            ))}
          </div>
          {metodo === 'credito' && (
            <label className="block max-w-xs text-sm">
              <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide">Abono inicial</span>
              <input aria-label="Abono inicial" type="number" min="0" value={abono || ''} onChange={(e) => setAbono(Number(e.target.value))} className={entrada} />
              <span className="mt-1 block text-xs font-semibold text-ink-500">Queda por pagar {cop.format(totales.total - abonoOk)}. El crédito requiere que la orden tenga cliente.</span>
            </label>
          )}
          <button type="button" disabled={entregando || orden.items.length === 0} onClick={() => void entregar()} className="w-full bg-brand-500 px-5 py-4 text-base font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500 sm:w-auto">
            {entregando ? 'Registrando…' : `Entregar y cobrar ${cop.format(totales.total)}`}
          </button>
        </section>
      )}

      {orden.estado === 'entregada' && (
        <section className="flex flex-wrap items-center justify-between gap-3 bg-white p-6">
          <p className="font-semibold text-ink-700">Entregada {orden.fecha_entrega ? fechaHora(orden.fecha_entrega) : ''}.</p>
          {cobra && orden.venta_id && (
            <button type="button" onClick={() => void verComprobante()} className="bg-ink-950 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white hover:bg-ink-800">Ver comprobante</button>
          )}
        </section>
      )}

      {imprimir && <OrdenModal orden={orden} onClose={() => setImprimir(false)} />}
      {venta && <ComprobanteModal venta={venta} tituloExito={orden.estado === 'entregada' ? 'Orden entregada' : undefined} onClose={() => setVenta(null)} onAnulada={() => { setVenta(null); void cargar() }} />}
    </div>
  )
}
