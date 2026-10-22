import { useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Boxes,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { useAuth } from '../../context/AuthContext'
import { etiquetaRol, useNegocio } from '../../context/NegocioContext'
import type { Rol } from '../../context/NegocioContext'

interface Modulo {
  icon: LucideIcon
  label: string
  to?: string
  /** Roles que lo ven; sin lista = todos */
  roles?: Rol[]
  end?: boolean
}

const ADMINS: Rol[] = ['dueno', 'admin']
const VENDEN: Rol[] = ['dueno', 'admin', 'cajero']

const modulos: Modulo[] = [
  { icon: LayoutDashboard, label: 'Resumen', to: '/app', end: true },
  { icon: ShoppingCart, label: 'Mostrador', to: '/app/mostrador', roles: VENDEN },
  { icon: Receipt, label: 'Ventas', to: '/app/ventas', roles: VENDEN },
  { icon: ClipboardList, label: 'Órdenes de taller', to: '/app/ordenes' },
  { icon: Boxes, label: 'Inventario', to: '/app/inventario' },
  { icon: Truck, label: 'Proveedores', to: '/app/proveedores', roles: ADMINS },
  { icon: Gauge, label: 'Reportes', to: '/app/reportes', roles: ADMINS },
  { icon: Settings, label: 'Configuración', to: '/app/configuracion' },
]

const titulos: Record<string, string> = {
  '/app': 'Resumen',
  '/app/mostrador': 'Mostrador',
  '/app/ventas': 'Ventas',
  '/app/ordenes': 'Órdenes de taller',
  '/app/inventario': 'Inventario',
  '/app/proveedores': 'Proveedores',
  '/app/reportes': 'Reportes',
  '/app/configuracion': 'Configuración',
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { rol } = useNegocio()
  const base = 'flex w-full items-center gap-3 border-l-4 px-3.5 py-2.5 text-sm font-extrabold uppercase tracking-wide transition'
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Módulos">
      {modulos
        .filter((m) => !m.roles || (rol && m.roles.includes(rol)))
        .map(({ icon: Icon, label, to, end }) =>
          to ? (
            <NavLink
              key={label}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `${base} ${isActive ? 'border-brand-500 bg-ink-50 text-ink-950' : 'border-transparent text-ink-700 hover:bg-ink-50'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-brand-600' : ''} /> {label}
                </>
              )}
            </NavLink>
          ) : (
            <div key={label} className={`${base} cursor-not-allowed border-transparent text-ink-300`} aria-disabled="true">
              <Icon size={18} /> {label}
              <span className="ml-auto bg-ink-100 px-1.5 py-0.5 text-[10px] tracking-wider text-ink-500">Pronto</span>
            </div>
          ),
        )}
    </nav>
  )
}

/** Nombre del negocio con edición en línea para dueño y administrador. */
function NombreNegocio() {
  const { negocio, rol, renombrar } = useNegocio()
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const puede = rol === 'dueno' || rol === 'admin'

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    const msg = await renombrar(valor)
    setGuardando(false)
    if (msg) setError(msg)
    else setEditando(false)
  }

  if (editando) {
    return (
      <form onSubmit={guardar} className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          aria-label="Nombre del negocio"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="border-2 border-ink-950 bg-white px-2 py-1 text-sm font-bold"
        />
        <button disabled={guardando} className="bg-brand-500 px-3 py-1 text-xs font-extrabold uppercase text-ink-950">
          Guardar
        </button>
        <button type="button" onClick={() => setEditando(false)} className="text-xs font-bold uppercase text-ink-500">
          Cancelar
        </button>
        {error && (
          <span role="alert" className="w-full text-xs font-bold text-red-700">
            {error}
          </span>
        )}
      </form>
    )
  }
  return (
    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-500">
      {negocio?.nombre ?? 'Tu negocio'}
      {puede && (
        <button
          type="button"
          aria-label="Cambiar nombre del negocio"
          onClick={() => {
            setValor(negocio?.nombre ?? '')
            setError(null)
            setEditando(true)
          }}
          className="text-ink-500 hover:text-brand-600"
        >
          <Pencil size={13} />
        </button>
      )}
    </p>
  )
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const { negocio, rol } = useNegocio()
  const { pathname } = useLocation()
  const [menu, setMenu] = useState(false)

  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string }
  const nombre = meta.full_name || meta.name || user?.email?.split('@')[0] || 'Usuario'
  const limpia = pathname.replace(/\/$/, '')
  const titulo = titulos[limpia] ?? (limpia.startsWith('/app/ordenes/') ? 'Orden de taller' : 'Panel')

  return (
    <div className="min-h-screen bg-ink-50 lg:grid lg:grid-cols-[17rem_1fr]">
      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-[calc(100vh-2.25rem)] flex-col border-r border-ink-200 bg-white lg:flex print:hidden">
        <div className="px-6 py-5">
          <Logo />
        </div>
        <Sidebar />
        <div className="border-t border-ink-200 p-3">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-extrabold uppercase tracking-wide text-ink-700 transition hover:bg-ink-50"
          >
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Menú móvil */}
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <button type="button" className="absolute inset-0 bg-ink-950/60" onClick={() => setMenu(false)} aria-label="Cerrar menú" />
          <div className="relative flex h-full w-72 flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-5">
              <Logo />
              <button type="button" onClick={() => setMenu(false)} aria-label="Cerrar menú">
                <X size={22} />
              </button>
            </div>
            <Sidebar onNavigate={() => setMenu(false)} />
            <div className="border-t border-ink-200 p-3">
              <button type="button" onClick={signOut} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-extrabold uppercase tracking-wide text-ink-700">
                <LogOut size={18} /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-200 bg-white/90 px-5 backdrop-blur sm:px-8 print:hidden">
          <div className="flex items-center gap-3">
            <button type="button" className="p-2 lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menú">
              <Menu size={22} />
            </button>
            <div>
              <NombreNegocio />
              <p className="display text-xl text-ink-950">{titulo}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-extrabold text-ink-950">{nombre}</p>
              <p className="text-xs font-semibold text-ink-500">
                {rol ? `${etiquetaRol[rol]} · ` : ''}
                {user?.email}
              </p>
            </div>
            {negocio?.logo_url ? (
              <img
                src={negocio.logo_url}
                alt={`Logo de ${negocio.nombre}`}
                className="h-10 w-10 border-2 border-ink-950 bg-white object-contain"
              />
            ) : (
              <span className="slant-both grid h-10 w-12 place-items-center bg-brand-500 text-base font-extrabold uppercase text-ink-950" aria-hidden="true">
                {nombre.slice(0, 1)}
              </span>
            )}
          </div>
        </header>

        <main className="p-5 sm:p-8 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
