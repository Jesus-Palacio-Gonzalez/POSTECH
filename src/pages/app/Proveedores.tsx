import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Truck } from 'lucide-react'
import { CompraDetalle } from '../../components/CompraDetalle'
import type { CompraFila } from '../../components/CompraDetalle'
import { NuevaCompra } from '../../components/NuevaCompra'
import { ProveedorForm } from '../../components/ProveedorForm'
import type { Proveedor } from '../../components/ProveedorForm'
import { cop } from '../../lib/formato'
import { mensajeFuncion, supabase } from '../../lib/supabase'

type Pestana = 'compras' | 'proveedores'
const colorEstado = { pendiente: 'bg-brand-500 text-ink-950', recibida: 'bg-emerald-100 text-emerald-800', cancelada: 'bg-ink-100 text-ink-500' }

export default function Proveedores() {
  const [pestana, setPestana] = useState<Pestana>('compras')
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [compras, setCompras] = useState<CompraFila[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [formProv, setFormProv] = useState<{ p: Proveedor | null } | null>(null)
  const [nueva, setNueva] = useState(false)
  const [detalle, setDetalle] = useState<CompraFila | null>(null)

  const cargar = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from('proveedores').select('id, nombre, nit, contacto, telefono, email, direccion, notas, activo').order('nombre'),
      supabase.from('compras').select('id, numero, estado, fecha, total, factura_proveedor, notas, recibida_en, proveedores ( nombre )').order('numero', { ascending: false }).limit(200),
    ])
    const fallo = p.error ?? c.error
    setError(fallo ? mensajeFuncion(fallo) : null)
    setProveedores((p.data ?? []) as Proveedor[])
    setCompras((c.data ?? []) as unknown as CompraFila[])
    setCargando(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar()
  }, [cargar])

  const pendientes = compras.filter((c) => c.estado === 'pendiente')
  const nombreProv = (c: CompraFila) => (Array.isArray(c.proveedores) ? c.proveedores[0]?.nombre : c.proveedores?.nombre) ?? 'Sin proveedor'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl text-ink-950">Proveedores</h1>
          <p className="mt-2 font-semibold text-ink-700">Compras de mercancía y directorio de proveedores. El stock sube al recibir cada compra.</p>
        </div>
        <button type="button" onClick={() => (pestana === 'compras' ? setNueva(true) : setFormProv({ p: null }))} className="flex items-center gap-2 bg-brand-500 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600">
          <Plus size={18} /> {pestana === 'compras' ? 'Nueva compra' : 'Nuevo proveedor'}
        </button>
      </div>

      <div className="flex gap-2" role="group" aria-label="Sección">
        {(['compras', 'proveedores'] as const).map((x) => (
          <button key={x} type="button" aria-pressed={pestana === x} onClick={() => setPestana(x)} className={`border-2 px-4 py-2 text-xs font-extrabold uppercase tracking-wide ${pestana === x ? 'border-ink-950 bg-ink-950 text-brand-500' : 'border-ink-300 bg-white hover:border-ink-950'}`}>
            {x === 'compras' ? `Compras${pendientes.length ? ` (${pendientes.length} por recibir)` : ''}` : 'Proveedores'}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p>}

      {pestana === 'compras' ? (
        <div className={`overflow-x-auto bg-white ${cargando ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-ink-950 text-xs font-bold uppercase tracking-wider text-ink-300"><tr><th className="px-4 py-3">N.º</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-ink-100 font-semibold text-ink-700">
              {compras.map((c) => (
                <tr key={c.id} onClick={() => setDetalle(c)} className="cursor-pointer hover:bg-ink-50">
                  <td className="px-4 py-3 font-extrabold text-ink-950">{c.numero ?? '—'}</td>
                  <td className="px-4 py-3">{c.fecha}</td>
                  <td className="px-4 py-3">{nombreProv(c)}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 text-xs font-extrabold uppercase ${colorEstado[c.estado]}`}>{c.estado}</span></td>
                  <td className="px-4 py-3 text-right font-extrabold text-ink-950">{cop.format(Number(c.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cargando && compras.length === 0 && <p className="px-5 py-8 text-center text-sm font-semibold text-ink-500">Aún no hay compras. Registra la primera con «Nueva compra».</p>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {proveedores.map((p) => (
            <article key={p.id} className={`bg-white p-4 ${p.activo ? '' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center bg-ink-950 text-brand-500"><Truck size={16} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-ink-950">{p.nombre}</p>
                  <p className="text-xs font-semibold text-ink-500">{[p.nit && `NIT ${p.nit}`, p.contacto, p.telefono, p.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</p>
                </div>
                <button type="button" aria-label={`Editar ${p.nombre}`} onClick={() => setFormProv({ p })} className="p-1.5 text-ink-500 hover:text-brand-600"><Pencil size={16} /></button>
              </div>
            </article>
          ))}
          {!cargando && proveedores.length === 0 && <p className="col-span-full bg-white px-5 py-8 text-center text-sm font-semibold text-ink-500">Aún no hay proveedores.</p>}
        </div>
      )}

      {formProv && <ProveedorForm proveedor={formProv.p} onCerrar={() => setFormProv(null)} onGuardado={() => { setFormProv(null); void cargar() }} />}
      {nueva && <NuevaCompra proveedores={proveedores} onCerrar={() => setNueva(false)} onCreada={() => { setNueva(false); void cargar() }} />}
      {detalle && <CompraDetalle compra={detalle} onCerrar={() => setDetalle(null)} onCambio={() => { setDetalle(null); void cargar() }} />}
    </div>
  )
}
