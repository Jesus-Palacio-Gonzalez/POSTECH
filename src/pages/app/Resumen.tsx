import { AlertTriangle, Receipt, Wallet, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNegocio } from '../../context/NegocioContext'
import { cop } from '../../lib/formato'
import { useResumen } from '../../hooks/useResumen'
import type { EstadoOrden } from '../../hooks/useResumen'

const etiquetaEstado: Record<EstadoOrden, string> = {
  recibida: 'Recibida',
  diagnostico: 'Diagnóstico',
  reparacion: 'Reparación',
  lista: 'Lista',
}

const colorEstado: Record<EstadoOrden, string> = {
  recibida: 'bg-ink-100 text-ink-700',
  diagnostico: 'bg-amber-100 text-amber-800',
  reparacion: 'bg-brand-100 text-brand-800',
  lista: 'bg-emerald-100 text-emerald-800',
}

function Vacio({ children }: { children: string }) {
  return <p className="mt-5 bg-ink-50 px-4 py-6 text-center text-sm font-semibold text-ink-500">{children}</p>
}

export default function Resumen() {
  const { user } = useAuth()
  const { negocio } = useNegocio()
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string }
  const nombre = meta.full_name || meta.name || user?.email?.split('@')[0] || 'Usuario'
  const nombreNegocio = negocio?.nombre ?? 'Tu negocio'
  const { datos, error: errorDatos, cargando: cargandoDatos, recargar } = useResumen()
  const semana = datos?.semana ?? []
  const max = Math.max(1, ...semana.map((s) => s.total))
  const kpis: Array<{ icon: LucideIcon; label: string; value: string; nota: string }> = [
    { icon: Wallet, label: 'Ventas de hoy', value: datos?.veVentas ? cop.format(datos.ventasHoy) : '—', nota: datos?.veVentas ? 'completadas' : 'sin acceso' },
    { icon: Receipt, label: 'Ventas de mostrador', value: datos?.veVentas ? String(datos.cantidadVentasHoy) : '—', nota: 'hoy' },
    { icon: Wrench, label: 'Motos en taller', value: String(datos?.motosEnTaller ?? 0), nota: `${datos?.motosListas ?? 0} listas` },
    { icon: AlertTriangle, label: 'Productos con stock bajo', value: String(datos?.stockBajo.length ?? 0), nota: 'revisar' },
  ]

  return (
    <div className="space-y-6">
          <div>
            <h1 className="display text-5xl text-ink-950">Hola, {nombre}</h1>
            <p className="mt-2 font-semibold text-ink-700">Así va {nombreNegocio} hoy.</p>
          </div>

          {errorDatos && (
            <div role="alert" className="flex items-center justify-between gap-3 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              <span>{errorDatos}</span>
              <button type="button" onClick={() => void recargar()} className="font-extrabold uppercase">Reintentar</button>
            </div>
          )}

          <section className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${cargandoDatos ? 'opacity-60' : ''}`} aria-label="Indicadores">
            {kpis.map(({ icon: Icon, label, value, nota }) => (
              <article key={label} className="border-t-4 border-brand-500 bg-white p-5">
                <div className="flex items-center justify-between">
                  <Icon size={22} className="text-ink-700" />
                  <span className="bg-ink-950 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-brand-500">{nota}</span>
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
              {datos && !datos.veVentas ? (
                <Vacio>Tu rol no incluye el detalle de ventas.</Vacio>
              ) : (
                <div className="mt-6 flex h-52 items-end gap-3">
                  {semana.map((d) => (
                    <div key={d.dia + d.hoy} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <span className="text-xs font-bold text-ink-700">{d.total ? (d.total / 1_000_000).toFixed(2) : '0'}</span>
                      <div
                        className={`w-full ${d.hoy ? 'bg-brand-500' : 'bg-ink-950'}`}
                        style={{ height: `${Math.max(d.total ? 2 : 0.5, (d.total / max) * 78)}%` }}
                      />
                      <span className="text-xs font-bold uppercase text-ink-500">{d.dia}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white p-6" aria-label="Stock bajo">
              <h2 className="display flex items-center gap-2 text-2xl text-ink-950">
                <AlertTriangle size={20} className="text-brand-600" /> Stock bajo
              </h2>
              {datos && datos.stockBajo.length === 0 ? (
                <Vacio>Todo el inventario está por encima del mínimo.</Vacio>
              ) : (
                <ul className="mt-5 space-y-2.5">
                  {(datos?.stockBajo ?? []).slice(0, 6).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 bg-ink-50 px-4 py-3">
                      <span className="text-sm font-semibold text-ink-700">{p.nombre}</span>
                      <span className="shrink-0 bg-brand-500 px-2.5 py-1 text-xs font-extrabold text-ink-950">{p.stock} uds</span>
                    </li>
                  ))}
                </ul>
              )}
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
                  {(datos?.ordenes ?? []).map((o) => (
                    <tr key={o.id}>
                      <td className="px-6 py-3.5 font-extrabold text-ink-950">{o.numero ? `#${o.numero}` : '—'}</td>
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
                          {etiquetaEstado[o.estado]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {datos && datos.ordenes.length === 0 && (
              <p className="px-6 pb-6 text-sm font-semibold text-ink-500">No hay motos en el taller en este momento.</p>
            )}
          </section>
    </div>
  )
}
