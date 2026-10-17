import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { supabase, traducirError } from '../lib/supabase'

const campo =
  'w-full border-2 border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition placeholder:text-ink-500 focus:border-brand-500'

export default function ResetPassword() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setCargando(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setCargando(false)

    if (err) {
      setError(traducirError(err.message))
      return
    }
    setListo(true)
    setTimeout(() => navigate('/app', { replace: true }), 1500)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 py-10">
      <Link to="/" className="mb-8" aria-label="Ir al inicio">
        <Logo />
      </Link>

      <div className="w-full max-w-sm border border-ink-100 bg-white p-8 border-t-4 border-t-brand-500">
        <h1 className="display text-4xl text-ink-950">Nueva contraseña</h1>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <Loader2 className="animate-spin text-brand-500" />
          </div>
        ) : !session ? (
          <div className="mt-4 space-y-5">
            <p className="text-ink-700">
              Este enlace no es válido o ya expiró. Solicita uno nuevo para continuar.
            </p>
            <Link
              to="/login?modo=recuperar"
              className="slant-both block bg-brand-500 py-3.5 text-center text-sm font-extrabold uppercase tracking-wider text-ink-950 transition hover:bg-brand-400"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        ) : listo ? (
          <div className="mt-5 flex gap-2.5 border border-brand-200 bg-brand-50 p-3.5 text-sm font-semibold text-brand-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> Contraseña actualizada. Entrando al panel…
          </div>
        ) : (
          <form onSubmit={enviar} className="mt-6 space-y-4">
            <div>
              <label htmlFor="np" className="mb-1.5 block text-sm font-bold">
                Nueva contraseña
              </label>
              <input id="np" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={campo} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label htmlFor="cp" className="mb-1.5 block text-sm font-bold">
                Confirma la contraseña
              </label>
              <input id="cp" type="password" required minLength={6} autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} className={campo} placeholder="Repite la contraseña" />
            </div>

            {error && (
              <div role="alert" className="flex gap-2.5 border border-red-200 bg-red-50 p-3.5 text-sm font-semibold text-red-800">
                <AlertCircle size={18} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="flex w-full items-center justify-center gap-2 slant-both bg-brand-500 py-3.5 text-sm font-extrabold uppercase tracking-wider text-ink-950 transition hover:bg-brand-400 disabled:opacity-70"
            >
              {cargando && <Loader2 size={18} className="animate-spin" />} Guardar contraseña
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
