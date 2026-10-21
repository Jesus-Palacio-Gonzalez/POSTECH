import { Navigate, Route, Routes } from 'react-router-dom'
import { DevBanner } from './components/DevBanner'
import { Splash } from './components/Splash'
import { GuestRoute, NegocioGate, ProtectedRoute } from './components/RouteGuards'
import Landing from './pages/Landing'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import AppLayout from './pages/app/AppLayout'
import Resumen from './pages/app/Resumen'
import Mostrador from './pages/app/Mostrador'
import Ventas from './pages/app/Ventas'
import Configuracion from './pages/app/Configuracion'

export default function App() {
  return (
    <>
    <Splash />
    <DevBanner />
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* El enlace del correo de recuperación llega con una sesión temporal */}
      <Route path="/restablecer" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<NegocioGate />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Resumen />} />
            <Route path="mostrador" element={<Mostrador />} />
            <Route path="ventas" element={<Ventas />} />
            <Route path="configuracion" element={<Configuracion />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
