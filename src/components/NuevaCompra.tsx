import { useState } from 'react'
import type { FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { BuscadorProducto } from './BuscadorProducto'
import { Modal } from './Modal'
import type { Proveedor } from './ProveedorForm'
import { cop } from '../lib/formato'
import type { Producto } from '../lib/productos'
import { mensajeFuncion, supabase } from '../lib/supabase'
import { entrada } from '../lib/ui'

interface Linea { producto: Producto; cantidad: string; costo: string }

/** Registra una compra a proveedor (queda «pendiente»; el stock entra al recibirla). */
export function NuevaCompra({ proveedores, onCerrar, onCreada }: { proveedores: Proveedor[]; onCerrar: () => void; onCreada: () => void }) {
  const [proveedor, setProveedor] = useState('')
  const [factura, setFactura] = useState('')
  const [notas, setNotas] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([])
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function agregar(p: Producto) {
    if (p.es_servicio) return setError('Los servicios no se compran: no manejan stock.')
    setError(null)
    if (lineas.some((l) => l.producto.id === p.id)) return
    const { data } = await supabase.from('productos').select('precio_costo').eq('id', p.id).maybeSingle()
    setLineas((x) => (x.some((l) => l.producto.id === p.id) ? x : [...x, { producto: p, cantidad: '1', costo: String(Number(data?.precio_costo ?? 0)) }]))
  }
  const cambiar = (i: number, k: 'cantidad' | 'costo', v: string) => setLineas((x) => x.map((l, j) => (j === i ? { ...l, [k]: v } : l)))
  const total = lineas.reduce((a, l) => a + Number(l.cantidad) * Number(l.costo), 0)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (lineas.length === 0) return setError('Agrega al menos un producto.')
    if (lineas.some((l) => !(Number(l.cantidad) > 0) || Number(l.costo) < 0 || l.costo === '')) return setError('Revisa cantidades (mayores a 0) y costos.')
    setEnviando(true)
    setError(null)
    const { data: c, error: errC } = await supabase
      .from('compras')
      .insert({ proveedor_id: proveedor || null, factura_proveedor: factura.trim() || null, notas: notas.trim() || null })
      .select('id')
      .single()
    if (errC || !c) {
      setEnviando(false)
      return setError(mensajeFuncion(errC ?? {}))
    }
    const { error: errI } = await supabase
      .from('compra_items')
      .insert(lineas.map((l) => ({ compra_id: c.id, producto_id: l.producto.id, cantidad: Number(l.cantidad), costo_unitario: Number(l.costo) })))
    if (errI) {
      await supabase.from('compras').delete().eq('id', c.id)
      setEnviando(false)
      return setError(mensajeFuncion(errI))
    }
    setEnviando(false)
    onCreada()
  }

  return (
    <Modal titulo="Nueva compra" onCerrar={onCerrar} ancho="max-w-3xl">
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide">Proveedor</span>
            <select value={proveedor} onChange={(e) => setProveedor(e.target.value)} className={entrada}>
              <option value="">Sin proveedor</option>
              {proveedores.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide">N.º factura del proveedor</span>
            <input value={factura} onChange={(e) => setFactura(e.target.value)} className={entrada} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide">Notas</span>
            <input value={notas} onChange={(e) => setNotas(e.target.value)} className={entrada} />
          </label>
        </div>
        <BuscadorProducto onElegir={(p) => void agregar(p)} placeholder="Buscar producto a comprar" />
        {lineas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="bg-ink-100 text-xs font-bold uppercase tracking-wider text-ink-500">
                <tr><th className="px-3 py-2">Producto</th><th className="w-28 px-3 py-2">Cantidad</th><th className="w-36 px-3 py-2">Costo unit.</th><th className="px-3 py-2 text-right">Subtotal</th><th className="w-10" /></tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {lineas.map((l, i) => (
                  <tr key={l.producto.id}>
                    <td className="px-3 py-2 font-extrabold text-ink-950">{l.producto.nombre}<span className="block text-xs font-semibold text-ink-500">{l.producto.sku}</span></td>
                    <td className="px-3 py-2"><input aria-label={`Cantidad de ${l.producto.nombre}`} type="number" min="0" step="any" value={l.cantidad} onChange={(e) => cambiar(i, 'cantidad', e.target.value)} className={entrada} /></td>
                    <td className="px-3 py-2"><input aria-label={`Costo de ${l.producto.nombre}`} type="number" min="0" step="any" value={l.costo} onChange={(e) => cambiar(i, 'costo', e.target.value)} className={entrada} /></td>
                    <td className="px-3 py-2 text-right font-extrabold">{cop.format(Number(l.cantidad) * Number(l.costo) || 0)}</td>
                    <td><button type="button" aria-label={`Quitar ${l.producto.nombre}`} onClick={() => setLineas((x) => x.filter((_, j) => j !== i))} className="p-2 text-ink-500 hover:text-red-700"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-right text-lg font-extrabold">Total: {cop.format(total)}</p>
          </div>
        )}
        {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{error}</p>}
        <button disabled={enviando} className="w-full bg-brand-500 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600 disabled:opacity-60">
          {enviando ? 'Guardando…' : 'Guardar compra (pendiente de recibir)'}
        </button>
      </form>
    </Modal>
  )
}
