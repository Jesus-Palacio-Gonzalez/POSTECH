import { useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

const modulos: Array<{ icon: LucideIcon; label: string }> = [
  { icon: LayoutDashboard, label: 'Resumen' },
  { icon: ShoppingCart, label: 'Ventas' },
  { icon: Boxes, label: 'Inventario' },
  { icon: Users, label: 'Clientes' },
  { icon: BarChart3, label: 'Reportes' },
  { icon: Settings, label: 'Configuración' },
]

const kpis: Array<{ icon: LucideIcon; label: string; value: string; delta: string }> = [
  { icon: Wallet, label: 'Ventas de hoy', value: '$2.480.500', delta: '+18,4%' },
  { icon: Receipt, label: 'Transacciones', value: '86', delta: '+9,2%' },
  { icon: TrendingUp, label: 'Ticket promedio', value: '$28.840', delta: '+4,6%' },
  { icon: Users, label: 'Clientes nuevos', value: '12', delta: '+2' },
]

const semana = [
  { d: 'Lun', v: 1.42 },
  { d: 'Mar', v: 1.78 },
  { d: 'Mié', v: 1.55 },
  { d: 'Jue', v: 2.1 },
  { d: 'Vie', v: 2.62 },
  { d: 'Sáb', v: 3.05 },
  { d: 'Dom', v: 2.48 },
]

const ventas = [
  { id: '#1042', cliente: 'Cliente mostrador', metodo: 'Efectivo', total: '$33.500', hora: '14:52' },
  { id: '#1041', cliente: 'Laura Gómez', metodo: 'Tarjeta', total: '$58.200', hora: '14:31' },
  { id: '#1040', cliente: 'Cliente mostrador', metodo: 'Transferencia', total: '$12.000', hora: '14:08' },
  { id: '#1039', cliente: 'Andrés Rojas', metodo: 'Efectivo', total: '$74.900', hora: '13:47' },
  { id: '#1038', cliente: 'Cliente mostrador', metodo: 'Tarjeta', total: '$21.300', hora: '13:20' },
]

const stockBajo = [
  { n: 'Café en grano 500g', q: 3 },
  { n: 'Vasos 12oz (paq.)', q: 5 },
  { n: 'Leche deslactosada 1L', q: 6 },
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Módulos">
      {modulos.map(({ icon: Icon, label }, i) => (
        <button
          key={label}
          type="button"
          onClick={onNavigate}
          aria-current={i === 0 ? 'page' : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
            i === 0 ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-ink-50'
          }`}
        >
          <Icon size={18} /> {label}
        </button>
      ))}
    </nav>
  )
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [menu, setMenu] = useState(false)

  const meta = (user?.user_metadata ?? {}) as { full_name?: string; business_name?: string }
  const nombre = meta.full_name || user?.email?.split('@')[0] || 'Usuario'
  const negocio = meta.business_name || 'Tu negocio'
  const max = Math.max(...semana.map((s) => s.v))

  return (
    <div className="min-h-screen bg-ink-50 lg:grid lg:grid-cols-[17rem_1fr]">
      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-ink-100 bg-white lg:flex">
        <div className="px-6 py-5">
          <Logo />
        </div>
        <Sidebar />
        <div className="border-t border-ink-100 p-3">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
          >
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Menú móvil */}
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink-950/50" onClick={() => setMenu(false)} aria-label="Cerrar menú" />
          <div className="relative flex h-full w-72 flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-5">
              <Logo />
              <button type="button" onClick={() => setMenu(false)} aria-label="Cerrar menú">
                <X size={22} />
              </button>
            </div>
            <Sidebar onNavigate={() => setMenu(false)} />
            <div className="border-t border-ink-100 p-3">
              <button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-ink-700">
                <LogOut size={18} /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 bg-white/90 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg p-2 lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menú">
              <Menu size={22} />
            </button>
            <div>
              <p className="text-xs font-semibold text-ink-500">{negocio}</p>
              <p className="text-sm font-extrabold text-ink-950">Resumen</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-extrabold text-ink-950">{nombre}</p>
              <p className="text-xs font-semibold text-ink-500">{user?.email}</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-sm font-extrabold uppercase text-white" aria-hidden="true">
              {nombre.slice(0, 1)}
            </span>
          </div>
        </header>

        <main className="space-y-6 p-5 sm:p-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">Hola, {nombre} 👋</h1>
            <p className="mt-1 font-semibold text-ink-700">Así va {negocio} hoy. Los datos mostrados son de ejemplo.</p>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
            {kpis.map(({ icon: Icon, label, value, delta }) => (
              <article key={label} className="rounded-2xl border border-ink-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon size={19} />
                  </span>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-extrabold text-brand-700">{delta}</span>
                </div>
                <p className="mt-4 text-sm font-semibold text-ink-500">{label}</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink-950">{value}</p>
              </article>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-ink-100 bg-white p-6 xl:col-span-2" aria-label="Ventas de la semana">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-ink-950">Ventas de la semana</h2>
                <span className="text-xs font-bold text-ink-500">Millones COP</span>
              </div>
              <div className="mt-6 flex h-52 items-end gap-3">
                {semana.map((s, i) => (
                  <div key={s.d} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-xs font-bold text-ink-700">{s.v.toFixed(2)}</span>
                    <div
                      className={`w-full rounded-lg ${i === semana.length - 1 ? 'bg-brand-600' : 'bg-brand-100'}`}
                      style={{ height: `${(s.v / max) * 78}%` }}
                    />
                    <span className="text-xs font-semibold text-ink-500">{s.d}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-ink-100 bg-white p-6" aria-label="Stock bajo">
              <h2 className="flex items-center gap-2 font-extrabold text-ink-950">
                <AlertTriangle size={18} className="text-amber-500" /> Stock bajo
              </h2>
              <ul className="mt-5 space-y-3">
                {stockBajo.map((p) => (
                  <li key={p.n} className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3">
                    <span className="text-sm font-semibold text-ink-700">{p.n}</span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800">{p.q} uds</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white" aria-label="Últimas ventas">
            <h2 className="px-6 pt-6 font-extrabold text-ink-950">Últimas ventas</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="bg-ink-50 text-xs font-bold uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-6 py-3">Venta</th>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Pago</th>
                    <th className="px-6 py-3">Hora</th>
                    <th className="px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 font-semibold text-ink-700">
                  {ventas.map((v) => (
                    <tr key={v.id}>
                      <td className="px-6 py-3.5 font-extrabold text-ink-950">{v.id}</td>
                      <td className="px-6 py-3.5">{v.cliente}</td>
                      <td className="px-6 py-3.5">{v.metodo}</td>
                      <td className="px-6 py-3.5">{v.hora}</td>
                      <td className="px-6 py-3.5 text-right font-extrabold text-ink-950">{v.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
