import { useEffect, useRef, useState } from 'react'
import { Logo } from './Logo'

const CLAVE = 'postech-splash-visto'
const DURACION_MIN = 2600 // ms que dura como mínimo la carga
const DURACION_SALIDA = 650 // ms de la salida (la moto acelera y se va)

function yaVisto(): boolean {
  try {
    return sessionStorage.getItem(CLAVE) === '1'
  } catch {
    return false
  }
}

function marcarVisto() {
  try {
    sessionStorage.setItem(CLAVE, '1')
  } catch {
    /* sin almacenamiento: se mostrará de nuevo, no pasa nada */
  }
}

/** Moto deportiva de carreras, vista de lado. Dibujo original, sin marcas. */
function Moto() {
  return (
    <svg viewBox="0 0 320 170" className="h-auto w-full" aria-hidden="true">
      {/* Escape alto (cola de carrera) */}
      <path d="M132 110 Q100 112 54 90" stroke="#6B6B72" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M62 94 L46 86" stroke="#0B0B0C" strokeWidth="10" strokeLinecap="round" />

      {/* Basculante y horquilla */}
      <path d="M126 106 L66 120" stroke="#0B0B0C" strokeWidth="6" strokeLinecap="round" />
      <path d="M236 74 L256 120" stroke="#3D3D42" strokeWidth="7" strokeLinecap="round" />
      <path d="M244 96 L257 122" stroke="#B9B9BD" strokeWidth="2.5" strokeLinecap="round" />

      {/* Motor */}
      <path d="M120 86 H192 L200 116 H128 Z" fill="#0B0B0C" />
      <path d="M134 92 H186 M136 100 H190 M138 108 H194" stroke="#3D3D42" strokeWidth="2" />

      {/* Cola / colín */}
      <path d="M34 84 L96 64 L128 64 L128 84 L80 98 Z" fill="#FF6A13" />
      <path d="M72 76 L112 62 L128 62 L128 68 L82 84 Z" fill="#0B0B0C" />

      {/* Tanque */}
      <path d="M124 64 Q152 46 192 56 L198 78 L128 86 Z" fill="#FF6A13" />
      <path d="M140 62 Q160 54 182 59" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />

      {/* Carenado largo con nariz */}
      <path d="M190 56 L238 60 L272 92 L264 100 L214 100 L196 80 Z" fill="#FF6A13" />
      <path d="M214 100 L264 100 L261 107 L222 107 Z" fill="#0B0B0C" />
      {/* Parabrisas */}
      <path d="M222 38 L246 60 L226 62 Z" fill="#3D3D42" />
      {/* Faro */}
      <path d="M248 70 L264 84 L254 90 L242 77 Z" fill="#fff" />
      {/* Número de carrera */}
      <circle cx="220" cy="82" r="8" fill="#fff" />
      <text x="220" y="86.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0B0B0C" fontFamily="Barlow Condensed, sans-serif">
        7
      </text>
      {/* Guardabarros delantero */}
      <path d="M226 94 Q256 78 286 96" stroke="#0B0B0C" strokeWidth="5" strokeLinecap="round" fill="none" />

      {/* Piloto muy agachado */}
      <path d="M100 82 Q120 54 168 42 L190 50 L178 64 Q148 64 126 86 Z" fill="#0B0B0C" />
      <path d="M118 84 L160 80 L150 108" stroke="#0B0B0C" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M172 48 L218 58" stroke="#0B0B0C" strokeWidth="7" strokeLinecap="round" />
      <circle cx="198" cy="42" r="11" fill="#FF6A13" />
      <path d="M198 38 H210 V46 H200 Z" fill="#0B0B0C" />
      <path d="M188 40 L198 33" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />

      {/* Rueda trasera */}
      <g>
        <circle cx="66" cy="120" r="32" fill="#fff" stroke="#0B0B0C" strokeWidth="9" />
        <g className="splash-wheel" style={{ transformOrigin: '66px 120px' }}>
          <circle cx="66" cy="120" r="21" fill="none" stroke="#FF6A13" strokeWidth="3" />
          <path d="M66 99 V141 M45 120 H87 M51 105 L81 135 M81 105 L51 135" stroke="#3D3D42" strokeWidth="2.5" />
        </g>
        <circle cx="66" cy="120" r="5" fill="#0B0B0C" />
      </g>

      {/* Rueda delantera */}
      <g>
        <circle cx="256" cy="120" r="32" fill="#fff" stroke="#0B0B0C" strokeWidth="9" />
        <g className="splash-wheel" style={{ transformOrigin: '256px 120px' }}>
          <circle cx="256" cy="120" r="21" fill="none" stroke="#FF6A13" strokeWidth="3" />
          <path d="M256 99 V141 M235 120 H277 M241 105 L271 135 M271 105 L241 135" stroke="#3D3D42" strokeWidth="2.5" />
        </g>
        <circle cx="256" cy="120" r="5" fill="#0B0B0C" />
      </g>
    </svg>
  )
}

export function Splash() {
  const [visible, setVisible] = useState(() => !yaVisto())
  const [progreso, setProgreso] = useState(0)
  const [saliendo, setSaliendo] = useState(false)
  const reducido = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  // Bloquea el scroll mientras se muestra
  useEffect(() => {
    if (!visible) return
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
    }
  }, [visible])

  // Avance de la barra: sube con el tiempo y espera a que la página y las fuentes estén listas
  useEffect(() => {
    if (!visible) return

    const duracion = reducido.current ? 700 : DURACION_MIN
    const inicio = performance.now()
    let listo = document.readyState === 'complete'
    let fuentes = false
    let raf = 0
    let salida = 0

    const marcarListo = () => {
      listo = true
    }
    if (!listo) window.addEventListener('load', marcarListo, { once: true })

    document.fonts?.ready.then(() => {
      fuentes = true
    })
    // Si las fuentes tardan (o no hay red), no bloqueamos la entrada
    const tope = window.setTimeout(() => {
      fuentes = true
      listo = true
    }, 4500)

    const paso = (ahora: number) => {
      const t = Math.min((ahora - inicio) / duracion, 1)
      // Arranca rápido y se asienta: easeOutCubic, con tope de 92% hasta que todo cargue
      const suave = 1 - Math.pow(1 - t, 3)
      const todoListo = listo && (fuentes || !document.fonts)
      const objetivo = todoListo ? suave : Math.min(suave, 0.92)
      setProgreso(objetivo)

      if (t >= 1 && todoListo) {
        setProgreso(1)
        setSaliendo(true)
        salida = window.setTimeout(
          () => {
            marcarVisto()
            setVisible(false)
          },
          reducido.current ? 150 : DURACION_SALIDA,
        )
        return
      }
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(salida)
      clearTimeout(tope)
      window.removeEventListener('load', marcarListo)
    }
  }, [visible])

  if (!visible) return null

  const pct = Math.round(progreso * 100)

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Cargando POSTECH ${pct}%`}
      className={`fixed inset-0 z-[100] flex flex-col bg-ink-50 transition-opacity duration-500 ${
        saliendo ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDelay: saliendo ? '200ms' : '0ms' }}
    >
      {/* Marca arriba */}
      <div className="flex justify-center pt-10">
        <Logo />
      </div>

      {/* Escena central */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {/* Líneas de velocidad */}
        {!reducido.current && (
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {[18, 30, 42, 58, 70, 82].map((top, i) => (
              <span
                key={top}
                className="splash-speed absolute h-[3px] bg-brand-500/70"
                style={{
                  top: `${top}%`,
                  width: `${90 + (i % 3) * 60}px`,
                  animationDelay: `${i * 0.18}s`,
                  animationDuration: `${0.7 + (i % 3) * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="relative w-[min(78vw,520px)]">
          <div className={saliendo ? 'splash-exit' : reducido.current ? '' : 'splash-bob'}>
            <Moto />
          </div>

          {/* Sombra y asfalto */}
          <div className="relative -mt-1">
            <div className="mx-auto h-2 w-[70%] rounded-[50%] bg-ink-950/15 blur-[2px]" />
            <div className="absolute inset-x-[-20%] top-1 h-[3px] overflow-hidden" aria-hidden="true">
              <div
                className={`h-full w-[200%] ${reducido.current ? '' : 'splash-road'}`}
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #0B0B0C 0 28px, transparent 28px 56px)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de carga progresiva abajo */}
      <div className="px-6 pb-8 sm:px-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex items-end justify-between">
            <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-ink-700">
              {pct < 100 ? 'Calentando motores' : '¡Listo, a rodar!'}
            </span>
            <span className="display text-4xl leading-none text-ink-950">
              {pct}
              <span className="text-brand-500">%</span>
            </span>
          </div>
          <div className="relative h-3 w-full bg-ink-200" aria-hidden="true">
            <div
              className="absolute inset-y-0 left-0 bg-brand-500"
              style={{
                width: `${pct}%`,
                clipPath: pct < 100 ? 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' : undefined,
              }}
            />
          </div>
          <div className="checker mt-3 h-2 w-full opacity-90" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
