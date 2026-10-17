import { useState } from 'react'
import {
  AlertTriangle,
  Bike,
  Boxes,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

const modulos: Array<{ icon: LucideIcon; label: string }> = [
  { icon: LayoutDashboard, label: 'Resumen' },
  { icon: ShoppingCart, label: 'Mostrador' },
  { icon: ClipboardList, label: 'Órdenes de taller' },
  { icon: Boxes, label: 'Inventario' },
  { icon: Truck, label: 'Proveedores' },
  { icon: Gauge, label: 'Reportes' },
  { icon: Settings, label: 'Configuración' },
]

const kpis: Array<{ icon: LucideIcon; label: string; value: string; delta: string }> = [
  { icon: Wallet, label: 'Ventas de hoy', value: '$2.480.500', delta: '+18,4%' },
  { icon: Wrench, label: 'Motos en taller', value: '9', delta: '3 listas' },
  { icon: Receipt, label: 'Ventas de mostrador', value: '47', delta: '+9,2%' },
  { icon: Bike, label: 'Mano de obra hoy', value: '$612.000', delta: '+6,1%' },
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

type Estado = 'Recibida' | 'Diagnóstico' | 'Reparación' | 'Lista'

const ordenes: Array<{ id: string; placa: string; moto: string; trabajo: string; mecanico: string; estado: Estado }> = [
  { id: '#318', placa: 'KJH 47F', moto: 'Pulsar NS200', trabajo: 'Cambio de kit de arrastre', mecanico: 'Wilmer', estado: 'Reparación' },
  { id: '#317', placa: 'HDR 82D', moto: 'AKT NKD 125', trabajo: 'Mantenimiento general', mecanico: 'Jhon', estado: 'Lista' },
  { id: '#316', placa: 'MXC 19B', moto: 'Yamaha FZ 2.0', trabajo: 'Diagnóstico eléctrico', mecanico: 'Wilmer', estado: 'Diagnóstico' },
  { id: '#315', placa: 'PLA 55E', moto: 'Honda CB 190R', trabajo: 'Cambio de pastillas', mecanico: 'Andrés', estado: 'Recibida' },
  { id: '#314', placa: 'TRS 03C', moto: 'Suzuki Gixxer 150', trabajo: 'Cambio de aceite y filtro', mecanico: 'Jhon', estado: 'Lista' },
]

const colorEstado: Record<Estado, string> = {
  Recibida: 'bg-ink-100 text-ink-700',
  Diagnóstico: 'bg-amber-100 text-amber-800',
  Reparación: 'bg-brand-100 text-brand-800',
  Lista: 'bg-emerald-100 text-emerald-800',
}

const stockBajo = [
  { n: 'Kit de arrastre 428H 43/14', q: 2 },
  { n: 'Pastillas de freno delanteras', q: 4 },
  { n: 'Aceite 20W-50 (litro)', q: 6 },
  { n: 'Bujía CR8E', q: 5 },
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
          className={`flex w-full items-center gap-3 border-l-4 px-3.5 py-2.5 text-sm font-extrabold uppercase tracking-wide transition ${
            i === 0
              ? 'border-brand-500 bg-ink-50 text-ink-950'
              : 'border-transparent text-ink-700 hover:bg-ink-50'
          }`}
        >
          <Icon size={18} className={i === 0 ? 'text-brand-600' : ''} /> {label}
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
  const negocio = meta.business_name || 'Tu taller'
  const max = Math.max(...semana.map((s) => s.v))

  return (
    <div className="min-h-screen bg-ink-50 lg:grid lg:grid-cols-[17rem_1fr]">
      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-ink-200 bg-white lg:flex">
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
        <div className="fixed inset-0 z-50 lg:hidden">
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-200 bg-white/90 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button type="button" className="p-2 lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menú">
              <Menu size={22} />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-ink-500">{negocio}</p>
              <p className="display text-xl text-ink-950">Resumen</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-extrabold text-ink-950">{nombre}</p>
              <p className="text-xs font-semibold text-ink-500">{user?.email}</p>
            </div>
            <span className="slant-both grid h-10 w-12 place-items-center bg-brand-500 text-base font-extrabold uppercase text-ink-950" aria-hidden="true">
              {nombre.slice(0, 1)}
            </span>
          </div>
        </header>

        <main className="space-y-6 p-5 sm:p-8">
          <div>
            <h1 className="display text-5xl text-ink-950">Hola, {nombre}</h1>
            <p className="mt-2 font-semibold text-ink-700">Así va {negocio} hoy. Los datos mostrados son de ejemplo.</p>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
            {kpis.map(({ icon: Icon, label, value, delta }) => (
              <article key={label} className="border-t-4 border-brand-500 bg-white p-5">
                <div className="flex items-center justify-between">
                  <Icon size={22} className="text-ink-700" />
                  <span className="bg-ink-950 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-brand-500">{delta}</span>
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-ink-500">{label}</p>
                <p className="display mt-1 text-4xl text-ink-950">{value}</p>
              </article>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            <section className="bg-white p-6 xl:col-span-2" aria-label="Ventas de la semana">
              <div className="flex items-center justify-between">
                <h2 className="display text-2xl text-ink-950">Ventas de la semana</h2>
                <span className="text-xs font-bold uppercase tracking-widest text-ink-500">Millones COP</span>
              </div>
              <div className="mt-6 flex h-52 items-end gap-3">
                {semana.map((s, i) => (
                  <div key={s.d} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-xs font-bold text-ink-700">{s.v.toFixed(2)}</span>
                    <div
                      className={`w-full ${i === semana.length - 1 ? 'bg-brand-500' : 'bg-ink-950'}`}
                      style={{ height: `${(s.v / max) * 78}%` }}
                    />
                    <span className="text-xs font-bold uppercase text-ink-500">{s.d}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white p-6" aria-label="Stock bajo">
              <h2 className="display flex items-center gap-2 text-2xl text-ink-950">
                <AlertTriangle size={20} className="text-brand-600" /> Stock bajo
              </h2>
              <ul className="mt-5 space-y-2.5">
                {stockBajo.map((p) => (
                  <li key={p.n} className="flex items-center justify-between gap-3 bg-ink-50 px-4 py-3">
                    <span className="text-sm font-semibold text-ink-700">{p.n}</span>
                    <span className="shrink-0 bg-brand-500 px-2.5 py-1 text-xs font-extrabold text-ink-950">{p.q} uds</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="overflow-hidden bg-white" aria-label="Órdenes de taller">
            <h2 className="display px-6 pt-6 text-2xl text-ink-950">Órdenes de taller</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="bg-ink-950 text-xs font-bold uppercase tracking-wider text-ink-300">
                  <tr>
                    <th className="px-6 py-3">Orden</th>
                    <th className="px-6 py-3">Placa</th>
                    <th className="px-6 py-3">Moto y trabajo</th>
                    <th className="px-6 py-3">Mecánico</th>
                    <th className="px-6 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 font-semibold text-ink-700">
                  {ordenes.map((o) => (
                    <tr key={o.id}>
                      <td className="px-6 py-3.5 font-extrabold text-ink-950">{o.id}</td>
                      <td className="px-6 py-3.5">
                        <span className="rounded-sm border-2 border-ink-950 bg-amber-300 px-2 py-0.5 font-display text-base font-extrabold tracking-wider text-ink-950">
                          {o.placa}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="block font-extrabold text-ink-950">{o.moto}</span>
                        <span className="text-xs text-ink-500">{o.trabajo}</span>
                      </td>
                      <td className="px-6 py-3.5">{o.mecanico}</td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide ${colorEstado[o.estado]}`}>
                          {o.estado}
                        </span>
                      </td>
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
