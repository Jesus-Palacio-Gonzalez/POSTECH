import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { mensajeFuncion, supabase } from '../lib/supabase'
import { useNegocio } from '../context/NegocioContext'
import { cantidad, cop, fechaHora } from '../lib/formato'
import { etiquetaMetodo } from '../lib/ventas'
import type { VentaCompleta } from '../lib/ventas'

/** Documento imprimible: logo, datos fiscales del negocio, detalle y totales. */
export function Comprobante({ venta }: { venta: VentaCompleta }) {
  const { negocio } = useNegocio()
  const anulada = venta.estado === 'anulada'
  const base = venta.total - venta.impuesto
  const saldo = venta.total - venta.pagado
  const numero = venta.numero ? String(venta.numero).padStart(6, '0') : '—'
  const tieneIva = venta.impuesto > 0
  const nombreFiscal = negocio?.razon_social || negocio?.nombre
  const ubicacion = [negocio?.direccion, negocio?.ciudad].filter(Boolean).join(' · ')
  const contacto = [negocio?.telefono, negocio?.email].filter(Boolean).join(' · ')

  return (
    <article id="comprobante" className="relative mx-auto w-full max-w-md bg-white p-6 text-sm text-ink-950" aria-label={`Comprobante ${numero}`}>
      {anulada && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="-rotate-12 border-4 border-red-600 px-4 py-1 text-4xl font-black uppercase tracking-widest text-red-600/70">Anulada</span>
        </div>
      )}

      <header className="flex items-start gap-3 border-b-2 border-ink-950 pb-4">
        {negocio?.logo_url && (
          <img src={negocio.logo_url} alt="" className="h-16 w-16 shrink-0 object-contain" />
        )}
        <div className="min-w-0">
          <h2 className="display text-2xl leading-tight">{nombreFiscal}</h2>
          {negocio?.nit && <p className="font-bold">NIT {negocio.nit}</p>}
          {negocio?.regimen && <p className="text-xs text-ink-700">{negocio.regimen}</p>}
          {ubicacion && <p className="text-xs text-ink-700">{ubicacion}</p>}
          {contacto && <p className="text-xs text-ink-700">{contacto}</p>}
        </div>
      </header>

      <div className="mt-4 flex items-baseline justify-between">
        <p className="display text-xl">Comprobante de venta</p>
        <p className="display text-xl">N.º {numero}</p>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="font-bold uppercase text-ink-500">Fecha</dt>
        <dd>{fechaHora(venta.created_at)}</dd>
        <dt className="font-bold uppercase text-ink-500">Cliente</dt>
        <dd>
          {venta.cliente ? `${venta.cliente.nombre}${venta.cliente.documento ? ` · ${venta.cliente.documento}` : ''}` : 'Cliente de mostrador'}
        </dd>
        {venta.vendedor && (
          <>
            <dt className="font-bold uppercase text-ink-500">Atendió</dt>
            <dd>{venta.vendedor}</dd>
          </>
        )}
        <dt className="font-bold uppercase text-ink-500">Pago</dt>
        <dd>{etiquetaMetodo[venta.metodo_pago]}</dd>
      </dl>

      <table className="mt-4 w-full text-left text-xs">
        <thead className="border-y border-ink-950 uppercase tracking-wide">
          <tr>
            <th className="py-1.5">Descripción</th>
            <th className="py-1.5 text-right">Cant.</th>
            <th className="py-1.5 text-right">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-200">
          {venta.items.map((i) => (
            <tr key={i.id}>
              <td className="py-1.5 pr-2">
                {i.descripcion}
                <span className="block text-[11px] text-ink-500">
                  {cop.format(i.precio_unitario)} c/u{i.iva_porcentaje > 0 ? ` · IVA ${cantidad(i.iva_porcentaje)}%` : ''}
                  {i.descuento > 0 ? ` · desc. ${cop.format(i.descuento)}` : ''}
                </span>
              </td>
              <td className="py-1.5 text-right align-top">{cantidad(i.cantidad)}</td>
              <td className="py-1.5 text-right align-top font-bold">{cop.format(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-3 space-y-1 border-t border-ink-950 pt-3 text-xs">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{cop.format(venta.subtotal)}</dd></div>
        {venta.descuento > 0 && <div className="flex justify-between"><dt>Descuento</dt><dd>−{cop.format(venta.descuento)}</dd></div>}
        {tieneIva && (
          <>
            <div className="flex justify-between text-ink-700"><dt>Base gravable</dt><dd>{cop.format(base)}</dd></div>
            <div className="flex justify-between text-ink-700"><dt>IVA incluido</dt><dd>{cop.format(venta.impuesto)}</dd></div>
          </>
        )}
        <div className="flex items-baseline justify-between border-t-2 border-ink-950 pt-2">
          <dt className="display text-lg">Total</dt>
          <dd className="display text-2xl">{cop.format(venta.total)}</dd>
        </div>
        {venta.metodo_pago === 'credito' && (
          <>
            <div className="flex justify-between"><dt>Abonado</dt><dd>{cop.format(venta.pagado)}</dd></div>
            <div className="flex justify-between font-bold"><dt>Saldo pendiente</dt><dd>{cop.format(saldo)}</dd></div>
          </>
        )}
      </dl>

      {venta.notas && <p className="mt-3 text-xs text-ink-700">Notas: {venta.notas}</p>}
      {anulada && venta.motivo_anulacion && <p className="mt-3 text-xs font-bold text-red-700">Motivo de anulación: {venta.motivo_anulacion}</p>}
      <p className="mt-5 text-center text-xs text-ink-700">{negocio?.pie_comprobante || '¡Gracias por su compra!'}</p>
      <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-ink-500">Comprobante de venta · no es factura electrónica</p>
    </article>
  )
}

/** Ventana con el comprobante, botón de imprimir y (para dueño/admin) anulación. */
export function ComprobanteModal({
  venta,
  onClose,
  onAnulada,
  tituloExito,
}: {
  venta: VentaCompleta
  onClose: () => void
  onAnulada?: () => void
  tituloExito?: string
}) {
  const { rol } = useNegocio()
  const [anulando, setAnulando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const puedeAnular = (rol === 'dueno' || rol === 'admin') && venta.estado === 'completada' && onAnulada

  async function anular() {
    setEnviando(true)
    setError(null)
    const { error: err } = await supabase.rpc('anular_venta', { p_venta: venta.id, p_motivo: motivo.trim() || null })
    setEnviando(false)
    if (err) setError(mensajeFuncion(err))
    else onAnulada?.()
  }

  // Se monta fuera de #root: al imprimir se oculta toda la app y solo sale el comprobante
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink-950/70 p-4 print:static print:block print:bg-transparent print:p-0" role="dialog" aria-modal="true" aria-label="Comprobante de venta">
      <div className="my-4 w-full max-w-md print:my-0">
        <div className="flex items-center justify-between bg-ink-950 px-4 py-3 text-white print:hidden">
          <p className="display text-lg">{tituloExito ?? 'Comprobante'}</p>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="hover:text-brand-500">
            <X size={20} />
          </button>
        </div>
        <Comprobante venta={venta} />
        <div className="space-y-3 bg-white px-6 pb-6 print:hidden">
          {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
          {anulando ? (
            <div className="space-y-2">
              <input
                autoFocus
                aria-label="Motivo de la anulación"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo de la anulación (opcional)"
                className="w-full border-2 border-ink-950 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button type="button" disabled={enviando} onClick={() => void anular()} className="flex-1 bg-red-600 px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white disabled:opacity-60">
                  Confirmar anulación
                </button>
                <button type="button" onClick={() => setAnulando(false)} className="border-2 border-ink-950 px-4 py-2.5 text-sm font-extrabold uppercase">
                  Volver
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-2 bg-brand-500 px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600">
                <Printer size={16} /> Imprimir
              </button>
              {puedeAnular && (
                <button type="button" onClick={() => setAnulando(true)} className="border-2 border-red-600 px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide text-red-700 hover:bg-red-50">
                  Anular venta
                </button>
              )}
              <button type="button" onClick={onClose} className="border-2 border-ink-950 px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide">
                {tituloExito ? 'Nueva venta' : 'Cerrar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
