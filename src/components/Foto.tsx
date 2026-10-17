import { useState } from 'react'
import { Camera } from 'lucide-react'

interface FotoProps {
  /** Nombre del archivo dentro de /public/fotos, p. ej. "hero-taller.jpg" */
  archivo: string
  alt: string
  className?: string
  etiqueta?: string
}

/** Muestra una foto de /public/fotos; si no existe, un marco de carrera con indicación. */
export function Foto({ archivo, alt, className = '', etiqueta }: FotoProps) {
  const [fallo, setFallo] = useState(false)

  if (!fallo) {
    return (
      <img
        src={`/fotos/${archivo}`}
        alt={alt}
        loading="lazy"
        onError={() => setFallo(true)}
        className={`object-cover ${className}`}
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={`stripes relative flex flex-col items-center justify-center gap-2 bg-ink-950 text-center text-ink-300 ${className}`}
    >
      <Camera size={28} className="text-brand-500" aria-hidden="true" />
      <span className="px-4 text-xs font-bold uppercase tracking-widest">
        {etiqueta ?? 'Foto'} · /public/fotos/{archivo}
      </span>
    </div>
  )
}
