import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Logo } from '../components/Logo'
import { isSupabaseConfigured, supabase, traducirError } from '../lib/supabase'

type Modo = 'login' | 'registro' | 'recuperar'

const titulos: Record<Modo, { h: string; p: string }> = {
  login: { h: 'Bienvenido de vuelta', p: 'Ingresa a tu cuenta para continuar vendiendo.' },
  registro: { h: 'Crea tu cuenta', p: 'Empieza gratis y configura tu negocio en minutos.' },
  recuperar: { h: 'Recupera tu contraseña', p: 'Te enviaremos un enlace para crear una nueva.' },
}

const campo =
  'w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition placeholder:text-ink-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-100'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

export default function Login() {
  const [params, setParams] = useSearchParams()
  const modo: Modo = params.get('modo') === 'registro' ? 'registro' : params.get('modo') === 'recuperar' ? 'recuperar' : 'login'

  const [nombre, setNombre] = useState('')
  const [negocio, setNegocio] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const cambiarModo = (nuevo: Modo) => {
    setError(null)
    setAviso(null)
    setParams(nuevo === 'login' ? {} : { modo: nuevo })
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setAviso(null)

    if (!isSupabaseConfigured) {
      setError('Falta configurar Supabase: agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.')
      return
    }

    setCargando(true)
    try {
      if (modo === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (err) throw err
        // El cambio de sesión redirige automáticamente al panel (GuestRoute).
      } else if (modo === 'registro') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: nombre.trim(), business_name: negocio.trim() },
            emailRedirectTo: `${window.location.origin}/app`,
          },
        })
        if (err) throw err
        if (!data.session) {
          setAviso('¡Cuenta creada! Revisa tu correo y confirma tu dirección para poder ingresar.')
        }
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/restablecer`,
        })
        if (err) throw err
        setAviso('Si el correo existe, te enviamos un enlace para restablecer tu contraseña.')
      }
    } catch (err) {
      setError(traducirError(err instanceof Error ? err.message : String(err)))
    } finally {
      setCargando(false)
    }
  }

  const conGoogle = async () => {
    setError(null)
    if (!isSupabaseConfigured) {
      setError('Falta configurar Supabase: agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.')
      return
    }
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app` },
    })
    if (err) setError(traducirError(err.message))
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Volver al inicio">
            <Logo />
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm font-bold text-ink-700 transition hover:text-brand-700">
            <ArrowLeft size={16} /> Inicio
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-950">{titulos[modo].h}</h1>
          <p className="mt-2 text-ink-700">{titulos[modo].p}</p>

          {!isSupabaseConfigured && (
            <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>
                Supabase aún no está conectado. Copia <code>.env.example</code> a <code>.env</code> y completa las dos
                variables para activar el login.
              </p>
            </div>
          )}

          {modo !== 'recuperar' && (
            <>
              <button
                type="button"
                onClick={conGoogle}
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-ink-200 bg-white py-3 text-sm font-bold text-ink-900 transition hover:bg-ink-50"
              >
                <GoogleIcon /> Continuar con Google
              </button>
              <div className="my-6 flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-ink-500">
                <span className="h-px flex-1 bg-ink-100" /> o con tu correo <span className="h-px flex-1 bg-ink-100" />
              </div>
            </>
          )}

          <form onSubmit={enviar} className={`space-y-4 ${modo === 'recuperar' ? 'mt-8' : ''}`} noValidate={false}>
            {modo === 'registro' && (
              <>
                <div>
                  <label htmlFor="nombre" className="mb-1.5 block text-sm font-bold">
                    Tu nombre
                  </label>
                  <input id="nombre" required autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} placeholder="María Pérez" />
                </div>
                <div>
                  <label htmlFor="negocio" className="mb-1.5 block text-sm font-bold">
                    Nombre del negocio
                  </label>
                  <input id="negocio" required autoComplete="organization" value={negocio} onChange={(e) => setNegocio(e.target.value)} className={campo} placeholder="Cafetería El Roble" />
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-bold">
                Correo electrónico
              </label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={campo} placeholder="tu@negocio.com" />
            </div>

            {modo !== 'recuperar' && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-bold">
                    Contraseña
                  </label>
                  {modo === 'login' && (
                    <button type="button" onClick={() => cambiarModo('recuperar')} className="text-xs font-bold text-brand-700 hover:underline">
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={verPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${campo} pr-12`}
                    placeholder={modo === 'registro' ? 'Mínimo 6 caracteres' : '••••••••'}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-500 hover:text-ink-900"
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-semibold text-red-800">
                <AlertCircle size={18} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}
            {aviso && (
              <div role="status" className="flex gap-2.5 rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-sm font-semibold text-brand-800">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> {aviso}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {cargando && <Loader2 size={18} className="animate-spin" />}
              {modo === 'login' ? 'Iniciar sesión' : modo === 'registro' ? 'Crear cuenta' : 'Enviar enlace'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-semibold text-ink-700">
            {modo === 'login' && (
              <>
                ¿Aún no tienes cuenta?{' '}
                <button type="button" onClick={() => cambiarModo('registro')} className="font-extrabold text-brand-700 hover:underline">
                  Regístrate
                </button>
              </>
            )}
            {modo === 'registro' && (
              <>
                ¿Ya tienes cuenta?{' '}
                <button type="button" onClick={() => cambiarModo('login')} className="font-extrabold text-brand-700 hover:underline">
                  Inicia sesión
                </button>
              </>
            )}
            {modo === 'recuperar' && (
              <button type="button" onClick={() => cambiarModo('login')} className="font-extrabold text-brand-700 hover:underline">
                Volver a iniciar sesión
              </button>
            )}
          </p>
        </div>
      </main>

      <aside className="relative hidden overflow-hidden bg-ink-950 p-14 text-white lg:flex lg:flex-col lg:justify-between" aria-hidden="true">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
        <Logo tone="light" className="relative" />
        <div className="relative">
          <p className="text-4xl font-extrabold leading-tight tracking-tight">
            Tu negocio, <span className="text-brand-400">bajo control</span> desde el primer día.
          </p>
          <ul className="mt-8 space-y-3 text-ink-200">
            {['Ventas rápidas desde cualquier dispositivo', 'Inventario que se actualiza solo', 'Reportes claros para decidir mejor'].map((t) => (
              <li key={t} className="flex items-center gap-3 font-semibold">
                <CheckCircle2 size={20} className="text-brand-400" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm font-semibold text-ink-300">© {new Date().getFullYear()} POSTECH</p>
      </aside>
    </div>
  )
}
