export function DevBanner() {
  return (
    <div
      role="status"
      className="relative flex items-center justify-center gap-3 overflow-hidden bg-ink-950 px-4 py-2 text-center text-xs font-extrabold uppercase tracking-[0.2em] text-brand-500 sm:text-sm"
    >
      <span className="checker hidden h-3 w-10 sm:block" aria-hidden="true" />
      Sistema en desarrollo
      <span className="checker hidden h-3 w-10 sm:block" aria-hidden="true" />
    </div>
  )
}
