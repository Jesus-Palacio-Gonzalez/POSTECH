import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Cargando() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50">
      <div
        className="h-9 w-9 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600"
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
