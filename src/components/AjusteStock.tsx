import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { cantidad, fechaHora } from '../lib/formato'
import type { ProductoCompleto } from '../lib/productos'
import { mensajeFuncion, supabase } from '../lib/supabase'
import { entrada } from '../lib/ui'

interface Mov {
  id: number
  tipo: string
  cantidad: number | string
  stock_resultante: number | string | null
  nota: string | null
  created_at: string
}

const etiquetaTipo: Record<string, string> = { inicial: 'Stock inicial', compra: 'Compra', venta: 'Venta', ajuste: 'Ajuste', anulacion: 'Anulación' }

/** Corrige las existencias con un conteo real y muestra los últimos movimientos del producto. */
export function AjusteStock({ producto, onHecho, onCerrar }: { producto: ProductoCompleto; onHecho: () => void; onCerrar: () => void }) {
  const actual = Number(producto.stock_actual)
  const [real, setReal] = useState(String(actual))
  const [nota, setNota] = useState('')
  const [movs, setMovs] = useState<Mov[]>([])
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    void supabase
      .from('movimientos_inventario')
      .select('id, tipo, cantidad, stock_resultante, nota, created_at')
      .eq('producto_id', producto.id)
      .order('id', { ascending: false })
      .limit(15)
      .then(({ data }) => setMovs((data ?? []) as Mov[]))
  }, [producto.id])

  const dif = Number(real) - actual

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (real === '' || Number(real) < 0) {
      setError('Escribe el stock real contado (0 o más).')
      return
    }
    setEnviando(true)
    setError(null)
    const { error: err } = await supabase.rpc('ajustar_stock', { p_producto: producto.id, p_stock_real: Number(real), p_nota: nota.trim() || null })
    setEnviando(false)
    if (err) setError(mensajeFuncion(err))
    else onHecho()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink-950/70 p-4" role="dialog" aria-modal="true" aria-label="Ajustar stock">
      <form onSubmit={enviar} className="my-4 w-full max-w-lg bg-white">
        <div className="flex items-center justify-between bg-ink-950 px-5 py-3 text-white">
          <p className="display text-xl">Ajustar stock</p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="hover:text-brand-500"><X size={20} /></button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <p className="font-extrabold text-ink-950">{producto.nombre}</p>
            <p className="text-xs font-semibold text-ink-500">{producto.sku} · en sistema: {cantidad(actual)} {producto.unidad}</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Stock real contado</span>
            <input autoFocus type="number" min="0" step="any" value={real} onChange={(e) => setReal(e.target.value)} className={entrada} />
            {real !== '' && dif !== 0 && <span className={`mt-1 block text-xs font-bold ${dif > 0 ? 'text-emerald-700' : 'text-red-700'}`}>{dif > 0 ? '+' : ''}{cantidad(dif)} respecto al sistema</span>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Motivo (opcional)</span>
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Conteo físico, daño, pérdida…" className={entrada} />
          </label>
          {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{error}</p>}
          <div className="flex gap-3">
            <button disabled={enviando || dif === 0} className="flex-1 bg-brand-500 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500">
              {enviando ? 'Guardando…' : 'Aplicar ajuste'}
            </button>
            <button type="button" onClick={onCerrar} className="border-2 border-ink-950 px-5 py-3 text-sm font-extrabold uppercase tracking-wide">Cerrar</button>
          </div>

          <div>
            <h3 className="display text-lg text-ink-950">Últimos movimientos</h3>
            {movs.length === 0 ? (
              <p className="mt-2 text-xs font-semibold text-ink-500">Sin movimientos todavía.</p>
            ) : (
              <ul className="mt-2 divide-y divide-ink-100 text-xs">
                {movs.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span><b>{etiquetaTipo[m.tipo] ?? m.tipo}</b> · {fechaHora(m.created_at)}{m.nota ? ` · ${m.nota}` : ''}</span>
                    <span className="shrink-0 font-bold">{Number(m.cantidad) > 0 ? '+' : ''}{cantidad(m.cantidad)}{m.stock_resultante != null ? ` → ${cantidad(m.stock_resultante)}` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
