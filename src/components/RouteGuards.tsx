import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNegocio } from '../context/NegocioContext'

function Cargando() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50">
      <div
        className="h-9 w-9 animate-spin rounded-full border-4 border-ink-200 border-t-brand-500"
        role="status"
        aria-label="Cargando"
      />
    </div>
  )
}

/** Solo usuarios con sesión. Si no hay sesión, manda al login. */
export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Cargando />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Solo visitantes. Si ya hay sesión, manda al panel. */
export function GuestRoute() {
  const { session, loading } = useAuth()

  if (loading) return <Cargando />
  if (session) return <Navigate to="/app" replace />
  return <Outlet />
}

/** Exige un perfil activo con negocio (lo crea el trigger de registro). Si falta, explica qué pasó. */
export function NegocioGate() {
  const { negocio, cargando, error, errorTecnico, recargar } = useNegocio()
  const { signOut } = useAuth()

  if (cargando) return <Cargando />
  if (!negocio) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <div className="max-w-md border-2 border-ink-950 bg-white p-8 text-center">
          <h1 className="display text-4xl text-ink-950">No pudimos abrir tu negocio</h1>
          <p className="mt-3 font-semibold text-ink-700">
            {error ??
              'Tu cuenta no tiene un negocio activo. Si te invitaron a un equipo, pide a tu administrador que reactive tu acceso.'}
          </p>
          {errorTecnico && <p className="mt-3 break-words text-left text-xs font-mono text-ink-500">Detalle técnico: {errorTecnico}</p>}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void recargar()}
              className="bg-brand-500 px-5 py-3 font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="border-2 border-ink-950 px-5 py-3 font-extrabold uppercase tracking-wide text-ink-950 hover:bg-ink-100"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    )
  }
  return <Outlet />
}
