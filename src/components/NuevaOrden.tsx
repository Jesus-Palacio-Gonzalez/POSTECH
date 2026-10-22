import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { ClienteSelector } from './ClienteSelector'
import type { Cliente } from './ClienteSelector'
import { listarMecanicos } from '../lib/ordenes'
import type { Mecanico } from '../lib/ordenes'
import { nombreModelo } from '../lib/productos'
import type { ModeloMoto } from '../lib/productos'
import { mensajeFuncion, supabase } from '../lib/supabase'
import { entrada } from '../lib/ui'

interface MotoExistente {
  id: string
  placa: string
  color: string | null
  anio: number | null
  kilometraje: number | null
  cliente_id: string | null
  modelos_moto: { marca: string; modelo: string } | { marca: string; modelo: string }[] | null
}

const normalizar = (p: string) => p.toUpperCase().replace(/[\s-]/g, '')
const modeloDe = (m: MotoExistente) => {
  const x = Array.isArray(m.modelos_moto) ? m.modelos_moto[0] : m.modelos_moto
  return x ? nombreModelo(x) : 'Moto sin modelo'
}

/** Recibe una moto en el taller: busca por placa (o la registra) y abre la orden. */
export function NuevaOrden({ onCreada, onCerrar }: { onCreada: (id: string) => void; onCerrar: () => void }) {
  const [placa, setPlaca] = useState('')
  const [encontradas, setEncontradas] = useState<MotoExistente[]>([])
  const [moto, setMoto] = useState<MotoExistente | null>(null)
  const [nueva, setNueva] = useState(false)
  const [modelos, setModelos] = useState<ModeloMoto[]>([])
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([])
  const [datosMoto, setDatosMoto] = useState({ modelo_id: '', color: '', anio: '', kilometraje: '' })
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [orden, setOrden] = useState({ problema: '', km: '', mecanico: '', estimada: '' })
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    void (async () => {
      const [m, mods] = await Promise.all([
        listarMecanicos(),
        supabase.from('modelos_moto').select('id, marca, modelo, cilindraje').eq('activo', true).order('marca').order('modelo'),
      ])
      setMecanicos(m)
      setModelos((mods.data ?? []) as ModeloMoto[])
    })()
  }, [])

  // Búsqueda por placa mientras se escribe
  useEffect(() => {
    const p = normalizar(placa)
    if (moto || p.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEncontradas([])
      return
    }
    let vigente = true
    const espera = setTimeout(async () => {
      const { data } = await supabase
        .from('motos')
        .select('id, placa, color, anio, kilometraje, cliente_id, modelos_moto ( marca, modelo )')
        .eq('activo', true)
        .ilike('placa', `%${p}%`)
        .order('placa')
        .limit(5)
      if (vigente) setEncontradas((data ?? []) as unknown as MotoExistente[])
    }, 250)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [placa, moto])

  const exacta = encontradas.some((m) => m.placa === normalizar(placa))
  const puedeRegistrar = normalizar(placa).length >= 3 && !exacta && !moto

  function elegir(m: MotoExistente) {
    setMoto(m)
    setNueva(false)
    setPlaca(m.placa)
    if (m.kilometraje != null) setOrden((o) => ({ ...o, km: String(m.kilometraje) }))
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!moto && !nueva) {
      setError('Elige una moto o registra una nueva con su placa.')
      return
    }
    setEnviando(true)
    let motoId = moto?.id ?? ''
    let clienteId = moto?.cliente_id ?? null
    if (!moto) {
      const { data, error: err } = await supabase
        .from('motos')
        .insert({
          placa: normalizar(placa),
          modelo_id: datosMoto.modelo_id || null,
          color: datosMoto.color.trim() || null,
          anio: datosMoto.anio ? Number(datosMoto.anio) : null,
          kilometraje: datosMoto.kilometraje ? Number(datosMoto.kilometraje) : null,
          cliente_id: cliente?.id ?? null,
        })
        .select('id')
        .single()
      if (err) {
        setEnviando(false)
        setError(err.code === '23505' ? 'Ya existe una moto con esa placa. Búscala en la lista.' : mensajeFuncion(err))
        return
      }
      motoId = (data as { id: string }).id
      clienteId = cliente?.id ?? null
    }
    const { data, error: errOrden } = await supabase
      .from('ordenes_taller')
      .insert({
        moto_id: motoId,
        cliente_id: clienteId,
        mecanico_id: orden.mecanico || null,
        problema_reportado: orden.problema.trim(),
        kilometraje_entrada: orden.km ? Number(orden.km) : null,
        fecha_estimada: orden.estimada || null,
      })
      .select('id')
      .single()
    setEnviando(false)
    if (errOrden) {
      setError(mensajeFuncion(errOrden))
      return
    }
    onCreada((data as { id: string }).id)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink-950/70 p-4" role="dialog" aria-modal="true" aria-label="Nueva orden de taller">
      <form onSubmit={guardar} className="my-4 w-full max-w-xl bg-white">
        <div className="flex items-center justify-between bg-ink-950 px-5 py-3 text-white">
          <p className="display text-xl">Nueva orden de taller</p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="hover:text-brand-500"><X size={20} /></button>
        </div>
        <div className="space-y-5 p-5">
          <div>
            <label htmlFor="placa" className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Placa de la moto</label>
            <div className="flex gap-2">
              <input
                id="placa"
                autoFocus
                value={placa}
                onChange={(e) => { setPlaca(e.target.value.toUpperCase()); setMoto(null); setNueva(false) }}
                placeholder="KJH 47F"
                className={`${entrada} font-display text-lg uppercase tracking-widest`}
              />
              {moto && (
                <button type="button" onClick={() => { setMoto(null); setPlaca('') }} className="px-3 text-xs font-bold uppercase text-ink-500">Cambiar</button>
              )}
            </div>
            {!moto && encontradas.length > 0 && (
              <ul className="mt-2 border border-ink-200">
                {encontradas.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => elegir(m)} className="flex w-full justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-ink-50">
                      <span className="font-extrabold">{m.placa}</span>
                      <span className="text-ink-500">{modeloDe(m)}{m.color ? ` · ${m.color}` : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {puedeRegistrar && !nueva && (
              <button type="button" onClick={() => setNueva(true)} className="mt-2 text-sm font-extrabold text-brand-700 underline underline-offset-2">
                Registrar moto nueva con placa {normalizar(placa)}
              </button>
            )}
            {moto && <p className="mt-2 text-sm font-semibold text-ink-700">{modeloDe(moto)}{moto.anio ? ` ${moto.anio}` : ''}{moto.color ? ` · ${moto.color}` : ''}</p>}
          </div>

          {nueva && !moto && (
            <fieldset className="space-y-3 border-2 border-ink-950 p-4">
              <legend className="px-2 text-xs font-extrabold uppercase tracking-wide">Moto nueva</legend>
              <select aria-label="Modelo de la moto" value={datosMoto.modelo_id} onChange={(e) => setDatosMoto({ ...datosMoto, modelo_id: e.target.value })} className={entrada}>
                <option value="">Modelo (opcional)</option>
                {modelos.map((m) => <option key={m.id} value={m.id}>{nombreModelo(m)}{m.cilindraje ? ` ${m.cilindraje}` : ''}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input aria-label="Color" value={datosMoto.color} onChange={(e) => setDatosMoto({ ...datosMoto, color: e.target.value })} placeholder="Color" className={entrada} />
                <input aria-label="Año" type="number" min="1950" max="2100" value={datosMoto.anio} onChange={(e) => setDatosMoto({ ...datosMoto, anio: e.target.value })} placeholder="Año" className={entrada} />
                <input aria-label="Kilometraje de la moto" type="number" min="0" value={datosMoto.kilometraje} onChange={(e) => { setDatosMoto({ ...datosMoto, kilometraje: e.target.value }); setOrden((o) => ({ ...o, km: o.km || e.target.value })) }} placeholder="Km" className={entrada} />
              </div>
              <ClienteSelector cliente={cliente} onElegir={setCliente} requerido={false} />
            </fieldset>
          )}

          <div>
            <label htmlFor="problema" className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Problema reportado</label>
            <textarea id="problema" required rows={3} value={orden.problema} onChange={(e) => setOrden({ ...orden, problema: e.target.value })} placeholder="Ej. Ruido en la cadena, no enciende en frío…" className={entrada} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Km de entrada</span>
              <input type="number" min="0" value={orden.km} onChange={(e) => setOrden({ ...orden, km: e.target.value })} className={entrada} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Mecánico</span>
              <select value={orden.mecanico} onChange={(e) => setOrden({ ...orden, mecanico: e.target.value })} className={entrada}>
                <option value="">Sin asignar</option>
                {mecanicos.map((m) => <option key={m.id} value={m.id}>{m.nombre_completo || 'Sin nombre'}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Entrega estimada</span>
              <input type="date" value={orden.estimada} onChange={(e) => setOrden({ ...orden, estimada: e.target.value })} className={entrada} />
            </label>
          </div>

          {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{error}</p>}
          <div className="flex gap-3">
            <button disabled={enviando} className="flex-1 bg-brand-500 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600 disabled:opacity-60">
              {enviando ? 'Creando…' : 'Crear orden'}
            </button>
            <button type="button" onClick={onCerrar} className="border-2 border-ink-950 px-5 py-3 text-sm font-extrabold uppercase tracking-wide">Cancelar</button>
          </div>
        </div>
      </form>
    </div>
  )
}
