import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { NuevaOrden } from '../../components/NuevaOrden'
import { useNegocio } from '../../context/NegocioContext'
import { cop } from '../../lib/formato'
import { FLUJO, colorEstado, etiquetaEstado } from '../../lib/ordenes'
import type { EstadoOrden } from '../../lib/ordenes'
import { mensajeFuncion, supabase } from '../../lib/supabase'

interface Tarjeta {
  id: string
  numero: number | null
  estado: EstadoOrden
  problema: string
  placa: string
  moto: string
  mecanico: string
  fecha_estimada: string | null
  total: number
}

type Vista = 'activas' | 'historial'

export default function Ordenes() {
  const { rol } = useNegocio()
  const navigate = useNavigate()
  const puedeCrear = rol === 'dueno' || rol === 'admin' || rol === 'cajero'
  const [vista, setVista] = useState<Vista>('activas')
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nueva, setNueva] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    const estados = vista === 'activas' ? FLUJO : ['entregada', 'cancelada']
    const { data, error: err } = await supabase
      .from('ordenes_taller')
      .select('id, numero, estado, problema_reportado, moto_id, mecanico_id, fecha_estimada, total_estimado, fecha_ingreso')
      .in('estado', estados)
      .order('fecha_ingreso', { ascending: false })
      .limit(vista === 'activas' ? 200 : 100)
    if (err) {
      setError(mensajeFuncion(err))
      setCargando(false)
      return
    }
    type Fila = { id: string; numero: number | null; estado: EstadoOrden; problema_reportado: string; moto_id: string; mecanico_id: string | null; fecha_estimada: string | null; total_estimado: number | string }
    const filas = (data ?? []) as Fila[]
    const motoIds = [...new Set(filas.map((f) => f.moto_id))]
    const mecIds = [...new Set(filas.map((f) => f.mecanico_id).filter((x): x is string => !!x))]
    const [motosR, mecR] = await Promise.all([
      motoIds.length ? supabase.from('motos').select('id, placa, modelos_moto ( marca, modelo )').in('id', motoIds) : Promise.resolve({ data: [] }),
      mecIds.length ? supabase.from('perfiles').select('id, nombre_completo').in('id', mecIds) : Promise.resolve({ data: [] }),
    ])
    type FilaMoto = { id: string; placa: string; modelos_moto: { marca: string; modelo: string } | { marca: string; modelo: string }[] | null }
    const motos = new Map(((motosR.data ?? []) as unknown as FilaMoto[]).map((m) => [m.id, m]))
    const mecs = new Map(((mecR.data ?? []) as Array<{ id: string; nombre_completo: string }>).map((m) => [m.id, m.nombre_completo]))
    setTarjetas(
      filas.map((f) => {
        const m = motos.get(f.moto_id)
        const mod = m ? (Array.isArray(m.modelos_moto) ? m.modelos_moto[0] : m.modelos_moto) : null
        return {
          id: f.id,
          numero: f.numero,
          estado: f.estado,
          problema: f.problema_reportado,
          placa: m?.placa ?? '—',
          moto: mod ? `${mod.marca} ${mod.modelo}` : 'Moto sin modelo',
          mecanico: f.mecanico_id ? mecs.get(f.mecanico_id) || 'Sin nombre' : 'Sin asignar',
          fecha_estimada: f.fecha_estimada,
          total: Number(f.total_estimado),
        }
      }),
    )
    setError(null)
    setCargando(false)
  }, [vista])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar()
  }, [cargar])

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase().replace(/[\s-]/g, '')
    if (!q) return tarjetas
    return tarjetas.filter((t) => t.placa.toLowerCase().includes(q) || String(t.numero ?? '') === q.replace('#', '') || t.moto.toLowerCase().replace(/\s/g, '').includes(q))
  }, [tarjetas, filtro])

  const hoy = new Date().toISOString().slice(0, 10)

  const Card = ({ t }: { t: Tarjeta }) => (
    <button
      type="button"
      onClick={() => navigate(`/app/ordenes/${t.id}`)}
      className="w-full space-y-2 border-l-4 border-brand-500 bg-white p-4 text-left shadow-sm transition hover:bg-ink-50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-extrabold text-ink-950">#{t.numero ?? '—'}</span>
        <span className="rounded-sm border-2 border-ink-950 bg-amber-300 px-2 py-0.5 font-display text-base font-extrabold tracking-wider text-ink-950">{t.placa}</span>
      </div>
      <p className="text-sm font-extrabold text-ink-950">{t.moto}</p>
      <p className="line-clamp-2 text-xs font-semibold text-ink-500">{t.problema}</p>
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-ink-700">
        <span>{t.mecanico}</span>
        <span>{t.total > 0 ? cop.format(t.total) : ''}</span>
      </div>
      {vista === 'activas' && t.fecha_estimada && (
        <p className={`text-[11px] font-extrabold uppercase tracking-wide ${t.fecha_estimada < hoy && t.estado !== 'lista' ? 'text-red-700' : 'text-ink-500'}`}>
          Entrega {t.fecha_estimada < hoy && t.estado !== 'lista' ? 'vencida · ' : ''}{t.fecha_estimada}
        </p>
      )}
      {vista === 'historial' && <span className={`inline-block px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${colorEstado[t.estado]}`}>{etiquetaEstado[t.estado]}</span>}
    </button>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl text-ink-950">Órdenes de taller</h1>
          <p className="mt-2 font-semibold text-ink-700">
            {rol === 'mecanico' ? 'Tus órdenes asignadas.' : 'Todas las motos que están en el taller.'}
          </p>
        </div>
        {puedeCrear && (
          <button type="button" onClick={() => setNueva(true)} className="flex items-center gap-2 bg-brand-500 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600">
            <Plus size={18} /> Nueva orden
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2" role="group" aria-label="Vista">
          {(['activas', 'historial'] as Vista[]).map((v) => (
            <button key={v} type="button" aria-pressed={vista === v} onClick={() => setVista(v)} className={`border-2 px-3 py-2 text-xs font-extrabold uppercase tracking-wide ${vista === v ? 'border-ink-950 bg-ink-950 text-brand-500' : 'border-ink-300 bg-white hover:border-ink-950'}`}>
              {v === 'activas' ? 'En el taller' : 'Historial'}
            </button>
          ))}
        </div>
        <label className="relative block min-w-56 flex-1 sm:max-w-sm">
          <span className="sr-only">Buscar orden</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Placa, número o modelo" className="w-full border-2 border-ink-950 bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-brand-500" />
        </label>
      </div>

      {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p>}

      {vista === 'activas' ? (
        <div className={`grid gap-4 overflow-x-auto pb-2 md:grid-cols-2 xl:grid-cols-4 ${cargando ? 'opacity-60' : ''}`}>
          {FLUJO.map((estado) => {
            const lista = visibles.filter((t) => t.estado === estado)
            return (
              <section key={estado} aria-label={etiquetaEstado[estado]} className="min-w-64 space-y-3 bg-ink-100/60 p-3">
                <h2 className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-ink-700">
                  {etiquetaEstado[estado]}
                  <span className="bg-ink-950 px-2 py-0.5 text-brand-500">{lista.length}</span>
                </h2>
                {lista.map((t) => <Card key={t.id} t={t} />)}
                {lista.length === 0 && <p className="px-2 py-4 text-center text-xs font-semibold text-ink-500">Sin motos</p>}
              </section>
            )
          })}
        </div>
      ) : (
        <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${cargando ? 'opacity-60' : ''}`}>
          {visibles.map((t) => <Card key={t.id} t={t} />)}
          {!cargando && visibles.length === 0 && <p className="col-span-full bg-white px-4 py-8 text-center text-sm font-semibold text-ink-500">No hay órdenes en el historial.</p>}
        </div>
      )}

      {nueva && <NuevaOrden onCerrar={() => setNueva(false)} onCreada={(id) => navigate(`/app/ordenes/${id}`)} />}
    </div>
  )
}
