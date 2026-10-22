import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { UserPlus, Wrench } from 'lucide-react'
import { etiquetaRol, useNegocio } from '../context/NegocioContext'
import type { Rol } from '../context/NegocioContext'
import { cambiarActivo, cambiarRol, cancelarInvitacion, listarEquipo, registrarMiembro } from '../lib/equipo'
import type { Invitacion, Miembro, NuevoMiembro } from '../lib/equipo'
import { useAuth } from '../context/AuthContext'
import { entrada } from '../lib/ui'

const vacio: NuevoMiembro = { nombre: '', telefono: '', email: '', clave: '', rol: 'mecanico' }

/** Sección «Equipo» de Configuración: registrar mecánicos y demás personal con sus credenciales. */
export function Equipo() {
  const { user } = useAuth()
  const { rol } = useNegocio()
  const esDueno = rol === 'dueno'
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [pendientes, setPendientes] = useState<Invitacion[]>([])
  const [form, setForm] = useState<NuevoMiembro>(vacio)
  const [abierto, setAbierto] = useState(false)
  const [trabajando, setTrabajando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const cargar = useCallback(async () => {
    const r = await listarEquipo()
    if (r.error) setMsg({ tipo: 'error', texto: r.error })
    setMiembros(r.miembros)
    setPendientes(r.pendientes)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar()
  }, [cargar])

  async function registrar(e: FormEvent) {
    e.preventDefault()
    setTrabajando(true)
    setMsg(null)
    const err = await registrarMiembro(form)
    setTrabajando(false)
    if (err) {
      setMsg({ tipo: 'error', texto: err })
      return
    }
    setMsg({
      tipo: 'ok',
      texto: `${form.nombre.trim()} ya tiene acceso. Entrégale su correo y contraseña. Si no puede entrar, debe confirmar el correo que le llegó (o desactiva «Confirm email» en Supabase).`,
    })
    setForm(vacio)
    setAbierto(false)
    await cargar()
  }

  async function accion(p: Promise<string | null>) {
    const err = await p
    setMsg(err ? { tipo: 'error', texto: err } : null)
    await cargar()
  }

  return (
    <section className="space-y-4 bg-white p-6" aria-label="Equipo">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="display text-2xl text-ink-950">Equipo</h2>
          <p className="text-sm font-semibold text-ink-500">Mecánicos y personal con acceso al sistema. Los mecánicos aparecen al asignar órdenes de taller.</p>
        </div>
        <button type="button" onClick={() => setAbierto((v) => !v)} className="flex items-center gap-2 bg-brand-500 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600">
          <UserPlus size={16} /> Registrar personal
        </button>
      </div>

      {abierto && (
        <form onSubmit={registrar} aria-label="Registrar personal" className="grid gap-3 border-2 border-ink-950 p-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide">Nombre completo</span>
            <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={entrada} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide">Teléfono</span>
            <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className={entrada} inputMode="tel" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide">Rol</span>
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as NuevoMiembro['rol'] })} className={entrada}>
              <option value="mecanico">Mecánico</option>
              <option value="cajero">Cajero</option>
              {esDueno && <option value="admin">Administrador</option>}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide">Correo (su usuario)</span>
            <input required type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={entrada} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide">Contraseña</span>
            <input required type="text" autoComplete="off" minLength={6} value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} className={entrada} placeholder="Mínimo 6 caracteres" />
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <button disabled={trabajando} className="bg-ink-950 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white hover:bg-ink-800 disabled:opacity-60">
              {trabajando ? 'Registrando…' : 'Crear acceso'}
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="text-xs font-bold uppercase text-ink-500">Cancelar</button>
          </div>
        </form>
      )}

      {msg && (
        <p role={msg.tipo === 'error' ? 'alert' : 'status'} className={`text-sm font-bold ${msg.tipo === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{msg.texto}</p>
      )}

      <ul className="divide-y divide-ink-100">
        {miembros.map((m) => {
          const yo = m.id === user?.id
          const bloqueado = yo || (m.rol === 'dueno' && !esDueno)
          return (
            <li key={m.id} className={`flex flex-wrap items-center gap-3 py-3 ${m.activo ? '' : 'opacity-60'}`}>
              <span className="grid h-9 w-9 place-items-center bg-ink-950 text-brand-500"><Wrench size={16} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-extrabold text-ink-950">{m.nombre_completo}{yo ? ' (tú)' : ''}</p>
                <p className="text-xs font-semibold text-ink-500">{m.telefono || 'Sin teléfono'}{m.activo ? '' : ' · Desactivado'}</p>
              </div>
              {esDueno && !yo && m.rol !== 'dueno' ? (
                <select aria-label={`Rol de ${m.nombre_completo}`} value={m.rol} onChange={(e) => void accion(cambiarRol(m.id, e.target.value as Rol))} className="border-2 border-ink-300 bg-white px-2 py-1 text-xs font-extrabold uppercase">
                  <option value="admin">Administrador</option>
                  <option value="cajero">Cajero</option>
                  <option value="mecanico">Mecánico</option>
                </select>
              ) : (
                <span className="bg-ink-100 px-2.5 py-1 text-xs font-extrabold uppercase text-ink-700">{etiquetaRol[m.rol]}</span>
              )}
              {!bloqueado && (
                <button type="button" onClick={() => void accion(cambiarActivo(m.id, !m.activo))} className="text-xs font-extrabold uppercase text-ink-700 underline hover:text-brand-600">
                  {m.activo ? 'Desactivar' : 'Activar'}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {pendientes.length > 0 && (
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink-500">Invitaciones pendientes</h3>
          <ul className="mt-2 space-y-1 text-sm font-semibold text-ink-700">
            {pendientes.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3">
                <span>{i.email} · {etiquetaRol[i.rol]}</span>
                <button type="button" onClick={() => void accion(cancelarInvitacion(i.id))} className="text-xs font-extrabold uppercase text-red-700 underline">Cancelar</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
