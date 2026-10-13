interface LogoProps {
  className?: string
  tone?: 'dark' | 'light'
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0D9488" />
      <path
        d="M10.5 23V9h6.2a4.6 4.6 0 0 1 0 9.2H10.5"
        stroke="#fff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22.5" cy="22.5" r="2" fill="#99F6E4" />
    </svg>
  )
}

export function Logo({ className = '', tone = 'dark' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span
        className={`text-xl font-extrabold tracking-tight ${
          tone === 'dark' ? 'text-ink-950' : 'text-white'
        }`}
      >
        POS<span className="text-brand-500">TECH</span>
      </span>
    </span>
  )
}
