import { Construction } from 'lucide-react'

export function DevBanner() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-center text-xs font-extrabold uppercase tracking-wider text-ink-950 sm:text-sm"
    >
      <Construction size={16} className="shrink-0" aria-hidden="true" />
      Sistema en desarrollo
    </div>
  )
}
