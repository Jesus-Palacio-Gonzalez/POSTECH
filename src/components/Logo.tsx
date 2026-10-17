interface LogoProps {
  className?: string
  tone?: 'dark' | 'light'
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M5 0h27l-5 32H0z" fill="#0B0B0C" />
      <path
        d="M10 24V9h6.4a4.6 4.6 0 0 1 0 9.2H10"
        stroke="#FF6A13"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({ className = '', tone = 'dark' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {tone === 'light' ? (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M5 0h27l-5 32H0z" fill="#FF6A13" />
          <path
            d="M10 24V9h6.4a4.6 4.6 0 0 1 0 9.2H10"
            stroke="#0B0B0C"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <LogoMark />
      )}
      <span
        className={`display text-2xl ${tone === 'dark' ? 'text-ink-950' : 'text-white'}`}
      >
        POS<span className="text-brand-500">TECH</span>
      </span>
    </span>
  )
}
