import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ titulo, onCerrar, children, ancho = 'max-w-lg' }: { titulo: string; onCerrar: () => void; children: ReactNode; ancho?: string }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink-950/70 p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className={`my-4 w-full ${ancho} bg-white`}>
        <div className="flex items-center justify-between bg-ink-950 px-5 py-3 text-white">
          <p className="display text-xl">{titulo}</p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="hover:text-brand-500"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
