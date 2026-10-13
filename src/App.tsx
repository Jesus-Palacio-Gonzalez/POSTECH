import { Navigate, Route, Routes } from 'react-router-dom'
import { DevBanner } from './components/DevBanner'
import { GuestRoute, ProtectedRoute } from './components/RouteGuards'
import Landing from './pages/Landing'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <>
    <DevBanner />
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* El enlace del correo de recuperación llega con una sesión temporal */}
      <Route path="/restablecer" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<Dashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
