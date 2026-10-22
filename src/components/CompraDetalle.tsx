import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { cantidad, cop, fechaHora } from '../lib/formato'
import { mensajeFuncion, supabase } from '../lib/supabase'

export interface CompraFila {
  id: string
  numero: number | null
  estado: 'pendiente' | 'recibida' | 'cancelada'
  fecha: string
  total: number | string
  factura_proveedor: string | null
  notas: string | null
  recibida_en: string | null
  proveedores: { nombre: string } | { nombre: string }[] | null
}

interface Item { id: string; cantidad: number | string; costo_unitario: number | string; total: number | string; productos: { nombre: string; sku: string } | { nombre: string; sku: string }[] | null }
const uno = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x)

export function CompraDetalle({ compra, onCerrar, onCambio }: { compra: CompraFila; onCerrar: () => void; onCambio: () => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState(false)

  useEffect(() => {
    void supabase.from('compra_items').select('id, cantidad, costo_unitario, total, productos ( nombre, sku )').eq('compra_id', compra.id).order('id')
      .then(({ data }) => setItems((data ?? []) as unknown as Item[]))
  }, [compra.id])

  async function recibir() {
    setTrabajando(true)
    setError(null)
    const { error: err } = await supabase.rpc('recibir_compra', { p_compra: compra.id })
    setTrabajando(false)
    if (err) setError(mensajeFuncion(err))
    else onCambio()
  }
  async function cancelar() {
    setTrabajando(true)
    setError(null)
    const { data, error: err } = await supabase.from('compras').update({ estado: 'cancelada' }).eq('id', compra.id).eq('estado', 'pendiente').select('id')
    setTrabajando(false)
    if (err) setError(mensajeFuncion(err))
    else if (!data?.length) setError('Solo se puede cancelar una compra pendiente.')
    else onCambio()
  }

  const prov = uno(compra.proveedores)
  return (
    <Modal titulo={`Compra n.º ${compra.numero ?? '—'}`} onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="space-y-4">
        <p className="text-sm font-semibold text-ink-700">
          {prov?.nombre ?? 'Sin proveedor'} · {compra.fecha}{compra.factura_proveedor ? ` · Factura ${compra.factura_proveedor}` : ''}
          <span className="ml-2 bg-ink-100 px-2 py-0.5 text-xs font-extrabold uppercase">{compra.estado}</span>
        </p>
        {compra.recibida_en && <p className="text-xs font-semibold text-ink-500">Recibida el {fechaHora(compra.recibida_en)}</p>}
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-100 text-xs font-bold uppercase tracking-wider text-ink-500"><tr><th className="px-3 py-2">Producto</th><th className="px-3 py-2 text-right">Cant.</th><th className="px-3 py-2 text-right">Costo</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
          <tbody className="divide-y divide-ink-100">
            {items.map((i) => (
              <tr key={i.id}>
                <td className="px-3 py-2 font-extrabold text-ink-950">{uno(i.productos)?.nombre}</td>
                <td className="px-3 py-2 text-right">{cantidad(i.cantidad)}</td>
                <td className="px-3 py-2 text-right">{cop.format(Number(i.costo_unitario))}</td>
                <td className="px-3 py-2 text-right font-extrabold">{cop.format(Number(i.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-right text-lg font-extrabold">Total: {cop.format(Number(compra.total))}</p>
        {compra.notas && <p className="text-sm font-semibold text-ink-500">{compra.notas}</p>}
        {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{error}</p>}
        {compra.estado === 'pendiente' && (
          <div className="flex gap-3">
            <button disabled={trabajando} onClick={() => void recibir()} className="flex-1 bg-brand-500 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600 disabled:opacity-60">Recibir mercancía (suma al stock)</button>
            <button disabled={trabajando} onClick={() => void cancelar()} className="border-2 border-ink-950 px-5 py-3 text-sm font-extrabold uppercase tracking-wide hover:bg-ink-50 disabled:opacity-60">Cancelar compra</button>
          </div>
        )}
      </div>
    </Modal>
  )
}
