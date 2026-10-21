import { useCallback, useEffect, useState } from 'react'
import { ComprobanteModal } from '../../components/Comprobante'
import { useNegocio } from '../../context/NegocioContext'
import { cop, fechaHora } from '../../lib/formato'
import { mensajeFuncion, supabase } from '../../lib/supabase'
import { cargarVenta, etiquetaMetodo } from '../../lib/ventas'
import type { MetodoPago, VentaCompleta } from '../../lib/ventas'

interface Fila {
  id: string
  numero: number | null
  created_at: string
  estado: 'completada' | 'anulada'
  metodo_pago: MetodoPago
  total: number | string
  cliente_id: string | null
}

const rangos = [
  { dias: 0, texto: 'Hoy' },
  { dias: 6, texto: 'Últimos 7 días' },
  { dias: 29, texto: 'Últimos 30 días' },
]

export default function Ventas() {
  const { rol } = useNegocio()
  const puede = rol === 'dueno' || rol === 'admin' || rol === 'cajero'
  const [dias, setDias] = useState(0)
  const [filas, setFilas] = useState<Fila[]>([])
  const [clientes, setClientes] = useState<Map<string, string>>(new Map())
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abierta, setAbierta] = useState<VentaCompleta | null>(null)

  const cargar = useCallback(async () => {
    if (!puede) return
    setCargando(true)
    const desde = new Date()
    desde.setHours(0, 0, 0, 0)
    desde.setDate(desde.getDate() - dias)
    const { data, error: err } = await supabase
      .from('ventas')
      .select('id, numero, created_at, estado, metodo_pago, total, cliente_id')
      .gte('created_at', desde.toISOString())
      .order('created_at', { ascending: false })
      .limit(200)
    if (err) {
      setError(mensajeFuncion(err))
      setCargando(false)
      return
    }
    const lista = (data ?? []) as Fila[]
    const ids = [...new Set(lista.map((v) => v.cliente_id).filter((x): x is string => !!x))]
    const nombres = new Map<string, string>()
    if (ids.length) {
      const { data: cs } = await supabase.from('clientes').select('id, nombre').in('id', ids)
      for (const c of (cs ?? []) as Array<{ id: string; nombre: string }>) nombres.set(c.id, c.nombre)
    }
    setClientes(nombres)
    setFilas(lista)
    setError(null)
    setCargando(false)
  }, [dias, puede])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar()
  }, [cargar])

  async function abrir(id: string) {
    const [v, err] = await cargarVenta(id)
    if (v) setAbierta(v)
    else setError(err)
  }

  if (!puede) {
    return (
      <div className="mx-auto max-w-lg bg-white p-8 text-center">
        <h1 className="display text-4xl text-ink-950">Ventas</h1>
        <p className="mt-3 font-semibold text-ink-700">Tu rol no incluye el historial de ventas.</p>
      </div>
    )
  }

  const completadas = filas.filter((f) => f.estado === 'completada')
  const totalPeriodo = completadas.reduce((a, f) => a + Number(f.total), 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl text-ink-950">Ventas</h1>
          <p className="mt-2 font-semibold text-ink-700">
            {completadas.length} {completadas.length === 1 ? 'venta' : 'ventas'} · {cop.format(totalPeriodo)}
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Periodo">
          {rangos.map((r) => (
            <button
              key={r.dias}
              type="button"
              aria-pressed={dias === r.dias}
              onClick={() => setDias(r.dias)}
              className={`border-2 px-3 py-2 text-xs font-extrabold uppercase tracking-wide ${dias === r.dias ? 'border-ink-950 bg-ink-950 text-brand-500' : 'border-ink-300 bg-white hover:border-ink-950'}`}
            >
              {r.texto}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p>}

      <div className={`overflow-x-auto bg-white ${cargando ? 'opacity-60' : ''}`}>
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-ink-950 text-xs font-bold uppercase tracking-wider text-ink-300">
            <tr>
              <th className="px-5 py-3">N.º</th>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Pago</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 font-semibold text-ink-700">
            {filas.map((f) => (
              <tr key={f.id} className="cursor-pointer hover:bg-ink-50" onClick={() => void abrir(f.id)}>
                <td className="px-5 py-3 font-extrabold text-ink-950">
                  <button type="button" className="underline decoration-brand-500 decoration-2 underline-offset-2" onClick={(e) => { e.stopPropagation(); void abrir(f.id) }}>
                    {f.numero ? String(f.numero).padStart(6, '0') : '—'}
                  </button>
                </td>
                <td className="px-5 py-3">{fechaHora(f.created_at)}</td>
                <td className="px-5 py-3">{f.cliente_id ? clientes.get(f.cliente_id) ?? '—' : 'Mostrador'}</td>
                <td className="px-5 py-3">{etiquetaMetodo[f.metodo_pago]}</td>
                <td className="px-5 py-3 text-right font-extrabold text-ink-950">{cop.format(Number(f.total))}</td>
                <td className="px-5 py-3">
                  <span className={`px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide ${f.estado === 'anulada' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {f.estado === 'anulada' ? 'Anulada' : 'Completada'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cargando && filas.length === 0 && <p className="px-5 py-8 text-center text-sm font-semibold text-ink-500">No hay ventas en este periodo.</p>}
      </div>

      {abierta && (
        <ComprobanteModal
          venta={abierta}
          onClose={() => setAbierta(null)}
          onAnulada={() => {
            setAbierta(null)
            void cargar()
          }}
        />
      )}
    </div>
  )
}
