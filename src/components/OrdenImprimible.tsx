import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { useNegocio } from '../context/NegocioContext'
import { cantidad, cop, fechaHora } from '../lib/formato'
import type { OrdenCompleta } from '../lib/ordenes'

/** Orden de servicio impresa: se entrega al cliente al recibir la moto. */
export function OrdenModal({ orden, onClose }: { orden: OrdenCompleta; onClose: () => void }) {
  const { negocio } = useNegocio()
  const numero = orden.numero ? String(orden.numero).padStart(6, '0') : '—'
  const nombreFiscal = negocio?.razon_social || negocio?.nombre
  const ubicacion = [negocio?.direccion, negocio?.ciudad].filter(Boolean).join(' · ')
  const contacto = [negocio?.telefono, negocio?.email].filter(Boolean).join(' · ')

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink-950/70 p-4 print:static print:block print:bg-transparent print:p-0" role="dialog" aria-modal="true" aria-label="Orden de servicio">
      <div className="my-4 w-full max-w-md print:my-0">
        <div className="flex items-center justify-between bg-ink-950 px-4 py-3 text-white print:hidden">
          <p className="display text-lg">Orden de servicio</p>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="hover:text-brand-500"><X size={20} /></button>
        </div>
        <article id="comprobante" className="mx-auto w-full max-w-md bg-white p-6 text-sm text-ink-950">
          <header className="flex items-start gap-3 border-b-2 border-ink-950 pb-4">
            {negocio?.logo_url && <img src={negocio.logo_url} alt="" className="h-16 w-16 shrink-0 object-contain" />}
            <div className="min-w-0">
              <h2 className="display text-2xl leading-tight">{nombreFiscal}</h2>
              {negocio?.nit && <p className="font-bold">NIT {negocio.nit}</p>}
              {ubicacion && <p className="text-xs text-ink-700">{ubicacion}</p>}
              {contacto && <p className="text-xs text-ink-700">{contacto}</p>}
            </div>
          </header>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="display text-xl">Orden de servicio</p>
            <p className="display text-xl">N.º {numero}</p>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
            <dt className="font-bold uppercase text-ink-500">Ingreso</dt><dd>{fechaHora(orden.fecha_ingreso)}</dd>
            {orden.fecha_estimada && (<><dt className="font-bold uppercase text-ink-500">Entrega est.</dt><dd>{orden.fecha_estimada}</dd></>)}
            <dt className="font-bold uppercase text-ink-500">Cliente</dt>
            <dd>{orden.cliente ? `${orden.cliente.nombre}${orden.cliente.documento ? ` · ${orden.cliente.documento}` : ''}${orden.cliente.telefono ? ` · ${orden.cliente.telefono}` : ''}` : '—'}</dd>
            <dt className="font-bold uppercase text-ink-500">Moto</dt>
            <dd><b>{orden.moto?.placa}</b> {orden.moto?.modelo ?? ''}{orden.moto?.color ? ` · ${orden.moto.color}` : ''}{orden.moto?.anio ? ` · ${orden.moto.anio}` : ''}</dd>
            {orden.kilometraje_entrada != null && (<><dt className="font-bold uppercase text-ink-500">Kilometraje</dt><dd>{cantidad(orden.kilometraje_entrada)} km</dd></>)}
            {orden.mecanico && (<><dt className="font-bold uppercase text-ink-500">Mecánico</dt><dd>{orden.mecanico}</dd></>)}
          </dl>
          <p className="mt-4 text-xs font-bold uppercase text-ink-500">Problema reportado</p>
          <p className="whitespace-pre-wrap text-sm">{orden.problema_reportado}</p>
          {orden.diagnostico && (<><p className="mt-3 text-xs font-bold uppercase text-ink-500">Diagnóstico</p><p className="whitespace-pre-wrap text-sm">{orden.diagnostico}</p></>)}
          {orden.items.length > 0 && (
            <table className="mt-4 w-full text-left text-xs">
              <thead className="border-y border-ink-950 uppercase tracking-wide"><tr><th className="py-1.5">Detalle</th><th className="py-1.5 text-right">Cant.</th><th className="py-1.5 text-right">Valor</th></tr></thead>
              <tbody className="divide-y divide-ink-200">
                {orden.items.map((i) => (
                  <tr key={i.id}><td className="py-1.5 pr-2">{i.descripcion}</td><td className="py-1.5 text-right">{cantidad(i.cantidad)}</td><td className="py-1.5 text-right font-bold">{cop.format(i.total)}</td></tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t-2 border-ink-950"><td className="pt-2 font-extrabold uppercase" colSpan={2}>Total estimado</td><td className="pt-2 text-right font-extrabold">{cop.format(orden.total_estimado)}</td></tr></tfoot>
            </table>
          )}
          <p className="mt-5 text-[11px] text-ink-700">Autorizo la revisión y reparación de la moto descrita. El valor final puede variar según el diagnóstico y será informado antes de realizar trabajos adicionales.</p>
          <div className="mt-8 grid grid-cols-2 gap-6 text-center text-[11px] uppercase tracking-wide text-ink-500">
            <p className="border-t border-ink-950 pt-1">Firma del cliente</p>
            <p className="border-t border-ink-950 pt-1">Recibió</p>
          </div>
        </article>
        <div className="flex gap-2 bg-white px-6 pb-6 print:hidden">
          <button type="button" onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-2 bg-brand-500 px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600"><Printer size={16} /> Imprimir</button>
          <button type="button" onClick={onClose} className="border-2 border-ink-950 px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide">Cerrar</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
