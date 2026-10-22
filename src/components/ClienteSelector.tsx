import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { UserPlus, X } from 'lucide-react'
import { entrada } from '../lib/ui'
import { mensajeFuncion, supabase } from '../lib/supabase'

export interface Cliente {
  id: string
  nombre: string
  documento: string | null
  telefono: string | null
}

export function ClienteSelector({ cliente, onElegir, requerido }: { cliente: Cliente | null; onElegir: (c: Cliente | null) => void; requerido: boolean }) {
  const [q, setQ] = useState('')
  const [lista, setLista] = useState<Cliente[]>([])
  const [nuevo, setNuevo] = useState(false)
  const [form, setForm] = useState({ nombre: '', documento: '', telefono: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const termino = q.trim().replace(/[%,()]/g, '')
    if (termino.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLista([])
      return
    }
    let vigente = true
    const espera = setTimeout(async () => {
      const { data } = await supabase
        .from('clientes')
        .select('id, nombre, documento, telefono')
        .eq('activo', true)
        .or(`nombre.ilike.%${termino}%,documento.ilike.%${termino}%`)
        .order('nombre')
        .limit(5)
      if (vigente) setLista((data ?? []) as Cliente[])
    }, 250)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [q])

  async function crear() {
    if (!form.nombre.trim()) {
      setError('Escribe el nombre del cliente.')
      return
    }
    setError(null)
    const { data, error: err } = await supabase
      .from('clientes')
      .insert({ nombre: form.nombre.trim(), documento: form.documento.trim() || null, telefono: form.telefono.trim() || null })
      .select('id, nombre, documento, telefono')
      .single()
    if (err) {
      setError(err.code === '23505' ? 'Ya existe un cliente con ese documento.' : mensajeFuncion(err))
      return
    }
    onElegir(data as Cliente)
    setNuevo(false)
    setForm({ nombre: '', documento: '', telefono: '' })
    setQ('')
  }

  // Este bloque se usa dentro de otros formularios: Enter guarda el cliente sin enviar el formulario de afuera
  function alTeclear(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void crear()
    }
  }

  if (cliente) {
    return (
      <div className="flex items-center justify-between gap-2 bg-ink-50 px-3 py-2 text-sm">
        <span><span className="block text-[11px] font-bold uppercase tracking-widest text-ink-500">Cliente</span><b>{cliente.nombre}</b>{cliente.documento ? ` · ${cliente.documento}` : ''}</span>
        <button type="button" aria-label="Quitar cliente" onClick={() => onElegir(null)} className="text-ink-500 hover:text-red-700"><X size={16} /></button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-extrabold uppercase tracking-wide">Cliente {requerido ? '(obligatorio)' : '(opcional)'}</p>
      {nuevo ? (
        <div role="group" onKeyDown={alTeclear} className="space-y-2 border-2 border-ink-950 p-3" aria-label="Nuevo cliente">
          <input required autoFocus aria-label="Nombre del cliente" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre" className={entrada} />
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="Documento del cliente" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="Documento" className={entrada} />
            <input aria-label="Teléfono del cliente" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="Teléfono" className={entrada} />
          </div>
          {error && <p role="alert" className="text-xs font-bold text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => void crear()} className="flex-1 bg-ink-950 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-white">Guardar cliente</button>
            <button type="button" onClick={() => setNuevo(false)} className="px-2 text-xs font-bold uppercase text-ink-500">Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input aria-label="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} placeholder="Buscar por nombre o documento" className={entrada} />
            <button type="button" aria-label="Crear cliente nuevo" onClick={() => setNuevo(true)} className="grid w-11 shrink-0 place-items-center border-2 border-ink-950 hover:bg-ink-100"><UserPlus size={16} /></button>
          </div>
          {lista.length > 0 && (
            <ul className="border border-ink-200">
              {lista.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => { onElegir(c); setQ('') }} className="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-ink-50">
                    <span className="font-bold">{c.nombre}</span><span className="text-ink-500">{c.documento ?? ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
