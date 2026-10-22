import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from './Modal'
import { mensajeFuncion, supabase } from '../lib/supabase'
import { entrada } from '../lib/ui'

export interface Proveedor {
  id: string
  nombre: string
  nit: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  notas: string | null
  activo: boolean
}

const campos: Array<[keyof Omit<Proveedor, 'id' | 'activo'>, string]> = [
  ['nombre', 'Nombre o razón social'],
  ['nit', 'NIT'],
  ['contacto', 'Persona de contacto'],
  ['telefono', 'Teléfono'],
  ['email', 'Correo'],
  ['direccion', 'Dirección'],
]

export function ProveedorForm({ proveedor, onCerrar, onGuardado }: { proveedor: Proveedor | null; onCerrar: () => void; onGuardado: () => void }) {
  const [f, setF] = useState({
    nombre: proveedor?.nombre ?? '', nit: proveedor?.nit ?? '', contacto: proveedor?.contacto ?? '', telefono: proveedor?.telefono ?? '',
    email: proveedor?.email ?? '', direccion: proveedor?.direccion ?? '', notas: proveedor?.notas ?? '',
  })
  const [activo, setActivo] = useState(proveedor?.activo ?? true)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!f.nombre.trim()) return setError('Escribe el nombre del proveedor.')
    setEnviando(true)
    setError(null)
    const datos = { ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null])), nombre: f.nombre.trim(), activo }
    const { error: err } = proveedor
      ? await supabase.from('proveedores').update(datos).eq('id', proveedor.id)
      : await supabase.from('proveedores').insert(datos)
    setEnviando(false)
    if (err) setError(mensajeFuncion(err))
    else onGuardado()
  }

  return (
    <Modal titulo={proveedor ? 'Editar proveedor' : 'Nuevo proveedor'} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-2">
        {campos.map(([k, t]) => (
          <label key={k} className={`block ${k === 'nombre' || k === 'direccion' ? 'sm:col-span-2' : ''}`}>
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide">{t}</span>
            <input type={k === 'email' ? 'email' : 'text'} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={entrada} />
          </label>
        ))}
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide">Notas</span>
          <textarea rows={2} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} className={entrada} />
        </label>
        {proveedor && (
          <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Proveedor activo
          </label>
        )}
        {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 sm:col-span-2">{error}</p>}
        <button disabled={enviando} className="bg-brand-500 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600 disabled:opacity-60 sm:col-span-2">
          {enviando ? 'Guardando…' : 'Guardar proveedor'}
        </button>
      </form>
    </Modal>
  )
}
