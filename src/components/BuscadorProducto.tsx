import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { cop, cantidad } from '../lib/formato'
import type { Producto } from '../lib/productos'
import { mensajeFuncion, supabase } from '../lib/supabase'
import { entrada } from '../lib/ui'

/** Caja de búsqueda con lista de resultados (nombre, referencia o código de barras). */
export function BuscadorProducto({ onElegir, placeholder = 'Buscar repuesto por nombre o referencia' }: { onElegir: (p: Producto) => void; placeholder?: string }) {
  const [texto, setTexto] = useState('')
  const [lista, setLista] = useState<Producto[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (texto.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLista([])
      return
    }
    let vigente = true
    const espera = setTimeout(async () => {
      const { data, error: err } = await supabase.rpc('buscar_productos', { p_texto: texto, p_limite: 8 })
      if (!vigente) return
      if (err) {
        setError(mensajeFuncion(err))
        setLista([])
      } else {
        setError(null)
        setLista((data ?? []) as Producto[])
      }
    }, 250)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [texto])

  return (
    <div className="relative">
      <label className="relative block">
        <span className="sr-only">Buscar producto</span>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={placeholder} className={`${entrada} pl-9`} />
      </label>
      {error && <p role="alert" className="mt-1 text-xs font-bold text-red-700">{error}</p>}
      {lista.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto border-2 border-ink-950 bg-white shadow-lg">
          {lista.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onElegir(p)
                  setTexto('')
                  setLista([])
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-ink-50"
              >
                <span>
                  <span className="block font-extrabold text-ink-950">{p.nombre}</span>
                  <span className="text-xs text-ink-500">{p.sku}{p.es_servicio ? ' · Servicio' : ` · ${cantidad(Number(p.stock_actual))} en stock`}</span>
                </span>
                <span className="shrink-0 font-bold">{cop.format(Number(p.precio_venta))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
