import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bike,
  Boxes,
  Check,
  ChevronDown,
  ClipboardList,
  Gauge,
  Menu,
  MessageCircle,
  ScanBarcode,
  Truck,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '../components/Logo'
import { Foto } from '../components/Foto'
import { useAuth } from '../context/AuthContext'

// TODO: reemplazar por el WhatsApp real de POSTECH (solo dígitos, con indicativo de país)
const WHATSAPP_NUMBER = '573000000000'
const CONTACT_EMAIL = 'hola@postech.app'

const navLinks = [
  { href: '#para-quien', label: 'Para quién' },
  { href: '#caracteristicas', label: 'Características' },
  { href: '#precios', label: 'Precios' },
  { href: '#faq', label: 'Preguntas' },
  { href: '#contacto', label: 'Contacto' },
]

const features: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: ScanBarcode,
    title: 'Mostrador a toda velocidad',
    text: 'Busca por referencia, código de barras o nombre del repuesto y cobra en segundos, aunque la fila llegue a la puerta.',
  },
  {
    icon: Bike,
    title: 'Compatibilidad por moto',
    text: 'Relaciona cada repuesto con marca, modelo y cilindraje para vender la pieza correcta y evitar devoluciones.',
  },
  {
    icon: ClipboardList,
    title: 'Órdenes de trabajo',
    text: 'Recibe la moto por placa, asigna mecánico y sigue cada orden desde el diagnóstico hasta la entrega.',
  },
  {
    icon: Boxes,
    title: 'Inventario sin sorpresas',
    text: 'Existencias al día, alertas de stock bajo y control de lo que se usa en el taller y de lo que se vende.',
  },
  {
    icon: Truck,
    title: 'Proveedores y compras',
    text: 'Registra pedidos a distribuidores, costos y fechas de llegada para reponer a tiempo lo que más rota.',
  },
  {
    icon: Gauge,
    title: 'Reportes que se entienden',
    text: 'Qué repuestos se mueven, cuánto deja el taller y cómo rinde cada mecánico, sin hojas de cálculo.',
  },
]

const plans = [
  {
    name: 'Arranque',
    price: '$49.000',
    desc: 'Para el taller o almacén que empieza a ordenar su operación.',
    items: ['1 punto de venta', 'Hasta 2 usuarios', 'Ventas e inventario', 'Reportes básicos'],
    featured: false,
  },
  {
    name: 'Pista',
    price: '$99.000',
    desc: 'Para negocios con mecánicos, mostrador y mucho movimiento.',
    items: ['3 puntos de venta', 'Hasta 10 usuarios', 'Órdenes de trabajo', 'Roles y permisos', 'Soporte prioritario'],
    featured: true,
  },
  {
    name: 'Escudería',
    price: 'A medida',
    desc: 'Para cadenas de talleres y distribuidores con varias sedes.',
    items: ['Sedes ilimitadas', 'Usuarios ilimitados', 'Integraciones', 'Acompañamiento dedicado'],
    featured: false,
  },
]

const faqs = [
  {
    q: '¿Sirve para un taller y también para una tienda de repuestos?',
    a: 'Sí. Puedes usar solo el mostrador de repuestos, solo las órdenes de taller, o ambos en el mismo sistema si vendes piezas y también haces la mano de obra.',
  },
  {
    q: '¿Necesito instalar algo?',
    a: 'No. POSTECH funciona desde el navegador, en computador, tablet o celular. Entras, inicias sesión y trabajas.',
  },
  {
    q: '¿Puedo cargar mi inventario actual?',
    a: 'Esa es la idea: poder importar tu lista de repuestos desde una hoja de cálculo para no empezar de cero. Cuéntanos cómo la llevas hoy y lo planeamos contigo.',
  },
  {
    q: '¿Mis mecánicos y cajeros ven lo mismo?',
    a: 'No. Cada usuario tiene su rol: el mecánico ve sus órdenes, el cajero cobra y el dueño ve costos, utilidades y reportes.',
  },
  {
    q: '¿Puedo probarlo antes de pagar?',
    a: 'Sí. Crea tu cuenta gratis y explora el sistema. Si prefieres una demostración guiada, escríbenos.',
  },
]

function Navbar() {
  const [open, setOpen] = useState(false)
  const { session } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#inicio" aria-label="POSTECH, ir al inicio">
          <Logo />
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Principal">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-bold uppercase tracking-wider text-ink-700 transition hover:text-brand-600"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {session ? (
            <Link to="/app" className="slant-both bg-ink-950 px-6 py-2.5 text-sm font-extrabold uppercase tracking-wider text-white transition hover:bg-ink-900">
              Ir al panel
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 text-sm font-extrabold uppercase tracking-wider text-ink-950 transition hover:text-brand-600">
                Ingresar
              </Link>
              <Link
                to="/login?modo=registro"
                className="slant-both bg-brand-500 px-6 py-2.5 text-sm font-extrabold uppercase tracking-wider text-ink-950 transition hover:bg-brand-400"
              >
                Empezar gratis
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-ink-950 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-200 bg-white px-5 pb-5 lg:hidden">
          <nav className="flex flex-col py-2" aria-label="Móvil">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-ink-100 py-3 text-base font-bold uppercase tracking-wider text-ink-950"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-3">
            <Link to="/login" className="border border-ink-300 py-3 text-center text-sm font-extrabold uppercase tracking-wider">
              Ingresar
            </Link>
            <Link
              to="/login?modo=registro"
              className="bg-brand-500 py-3 text-center text-sm font-extrabold uppercase tracking-wider text-ink-950"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

/** Tarjeta de orden de trabajo que "flota" sobre la foto del hero. */
function OrdenCard() {
  const pasos = ['Recibida', 'Diagnóstico', 'Reparación', 'Lista']
  const actual = 2
  return (
    <div className="w-64 border-l-4 border-brand-500 bg-white p-4 shadow-2xl shadow-ink-950/30 sm:w-72" aria-hidden="true">
      <div className="flex items-center justify-between">
        <span className="rounded-sm border-2 border-ink-950 bg-amber-300 px-2 py-0.5 font-display text-lg font-extrabold leading-none tracking-wider text-ink-950">
          KJH 47F
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-ink-500">Orden #318</span>
      </div>
      <p className="mt-3 text-sm font-bold text-ink-950">Pulsar NS200 · Cambio de kit de arrastre</p>
      <p className="text-xs font-semibold text-ink-500">Mecánico: Wilmer</p>
      <div className="mt-4 flex gap-1">
        {pasos.map((p, i) => (
          <div key={p} className="flex-1">
            <div className={`h-1.5 ${i <= actual ? 'bg-brand-500' : 'bg-ink-200'}`} />
            <p className={`mt-1.5 text-[10px] font-bold uppercase tracking-wide ${i === actual ? 'text-brand-700' : 'text-ink-500'}`}>
              {p}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Tacometro() {
  return (
    <div className="flex items-center gap-3 bg-ink-950 px-4 py-3 text-white shadow-2xl shadow-ink-950/30" aria-hidden="true">
      <svg width="46" height="30" viewBox="0 0 46 30" fill="none">
        <path d="M4 27a19 19 0 0 1 38 0" stroke="#3D3D42" strokeWidth="4" strokeLinecap="round" />
        <path d="M4 27a19 19 0 0 1 28-16.6" stroke="#FF6A13" strokeWidth="4" strokeLinecap="round" />
        <path d="M23 27l9-14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-300">Ventas hoy</p>
        <p className="font-display text-2xl font-extrabold italic leading-none">$2.480.500</p>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden bg-ink-50">
      {/* Franja diagonal de fondo */}
      <div
        className="absolute inset-y-0 right-0 hidden w-[46%] bg-ink-950 lg:block"
        style={{ clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 0 100%)' }}
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-2 lg:pb-28 lg:pt-20">
        <div className="relative z-10">
          <span className="slant inline-flex items-center gap-2 bg-ink-950 py-1.5 pl-4 pr-8 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-500">
            <Wrench size={14} /> Para talleres y repuestos de motos
          </span>
          <h1 className="display mt-6 text-6xl text-ink-950 sm:text-7xl lg:text-8xl">
            Tu taller
            <br />
            a toda <span className="text-brand-500">velocidad</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-700">
            Vende repuestos, recibe motos y controla tu inventario desde un solo sistema. Menos papeles, menos filas,
            más motos saliendo reparadas.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login?modo=registro"
              className="slant-both group inline-flex items-center justify-center gap-2 bg-brand-500 px-9 py-4 text-base font-extrabold uppercase tracking-wider text-ink-950 transition hover:bg-brand-400"
            >
              Crear cuenta gratis
              <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </Link>
            <a
              href="#contacto"
              className="slant-both border-2 border-ink-950 bg-white px-9 py-3.5 text-center text-base font-extrabold uppercase tracking-wider text-ink-950 transition hover:bg-ink-950 hover:text-white"
            >
              Pedir una demo
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-ink-700">
            {['Sin instalación', 'Celular, tablet o PC', 'Listo en minutos'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check size={16} className="text-brand-600" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative">
            <Foto
              archivo="hero-taller.jpg"
              alt="Mecánico trabajando en una moto dentro del taller"
              etiqueta="Foto del hero"
              className="aspect-[4/5] w-full lg:aspect-[5/6]"
            />
            <div className="absolute -bottom-6 -left-4 sm:-left-8">
              <OrdenCard />
            </div>
            <div className="absolute -right-2 top-6 sm:-right-5">
              <Tacometro />
            </div>
          </div>
        </div>
      </div>
      <div className="checker h-5 w-full" aria-hidden="true" />
    </section>
  )
}

function ParaQuien() {
  const cards = [
    {
      icon: Wrench,
      kicker: 'Talleres de motos',
      title: 'Cada moto, en su orden',
      items: ['Recepción por placa con historial', 'Estados de la orden y mecánico asignado', 'Repuestos usados descontados del inventario', 'Cobro de repuestos y mano de obra juntos'],
      foto: { archivo: 'taller.jpg', alt: 'Interior de un taller de motos' },
    },
    {
      icon: Boxes,
      kicker: 'Almacenes de repuestos',
      title: 'La pieza correcta, al instante',
      items: ['Búsqueda por referencia o código de barras', 'Compatibilidad por marca y modelo', 'Alertas de stock y reposición', 'Ventas de mostrador y por mayor'],
      foto: { archivo: 'repuestos.jpg', alt: 'Estantería con repuestos de motos' },
    },
  ]

  return (
    <section id="para-quien" className="py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-600">Para quién es</p>
        <h2 className="display mt-3 max-w-2xl text-5xl text-ink-950 sm:text-6xl">
          Hecho para el mundo de las motos
        </h2>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {cards.map(({ icon: Icon, kicker, title, items, foto }) => (
            <article key={kicker} className="overflow-hidden border border-ink-200 bg-white">
              <Foto archivo={foto.archivo} alt={foto.alt} etiqueta={kicker} className="h-52 w-full" />
              <div className="p-7">
                <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">
                  <Icon size={16} /> {kicker}
                </p>
                <h3 className="display mt-3 text-4xl text-ink-950">{title}</h3>
                <ul className="mt-5 space-y-2.5">
                  {items.map((it) => (
                    <li key={it} className="flex items-start gap-2.5 font-semibold text-ink-700">
                      <Check size={18} className="mt-0.5 shrink-0 text-brand-600" /> {it}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="caracteristicas" className="bg-ink-950 py-24 text-white">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-500">Características</p>
        <h2 className="display mt-3 max-w-2xl text-5xl sm:text-6xl">Todo el equipo bajo un mismo techo</h2>

        <div className="mt-14 grid gap-px bg-ink-700 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }, i) => (
            <article key={title} className="group relative bg-ink-900 p-8 transition hover:bg-ink-950">
              <span className="display absolute right-6 top-5 text-5xl text-ink-700 transition group-hover:text-brand-500">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="grid h-12 w-12 place-items-center bg-brand-500 text-ink-950">
                <Icon size={22} />
              </span>
              <h3 className="mt-6 text-xl font-extrabold uppercase tracking-wide">{title}</h3>
              <p className="mt-3 leading-relaxed text-ink-300">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Cifras() {
  const datos = [
    { n: '3 seg', t: 'para encontrar un repuesto' },
    { n: '1 sistema', t: 'para mostrador y taller' },
    { n: '0 papeles', t: 'para seguir una orden' },
  ]
  return (
    <section className="bg-brand-500 py-10">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 text-ink-950 sm:grid-cols-3">
        {datos.map((d) => (
          <div key={d.n} className="flex items-baseline gap-3">
            <span className="display text-5xl">{d.n}</span>
            <span className="text-sm font-extrabold uppercase tracking-wider">{d.t}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section id="precios" className="py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-600">Precios</p>
        <h2 className="display mt-3 max-w-2xl text-5xl text-ink-950 sm:text-6xl">Elige tu categoría</h2>
        <p className="mt-4 max-w-xl text-lg text-ink-700">
          Precios mensuales de ejemplo en pesos colombianos. Cambia de plan cuando quieras.
        </p>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <article
              key={p.name}
              className={`relative flex flex-col p-8 ${
                p.featured ? 'bg-ink-950 text-white' : 'border border-ink-200 bg-white'
              }`}
            >
              {p.featured && (
                <span className="slant absolute -top-3 left-8 bg-brand-500 py-1 pl-4 pr-8 text-xs font-extrabold uppercase tracking-widest text-ink-950">
                  Más elegido
                </span>
              )}
              <h3 className="display text-4xl">{p.name}</h3>
              <p className={`mt-2 text-sm leading-relaxed ${p.featured ? 'text-ink-300' : 'text-ink-700'}`}>{p.desc}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="display text-5xl">{p.price}</span>
                {p.price.startsWith('$') && (
                  <span className={`text-sm font-bold ${p.featured ? 'text-ink-300' : 'text-ink-500'}`}>/mes</span>
                )}
              </p>
              <ul className="mt-7 flex-1 space-y-3">
                {p.items.map((it) => (
                  <li key={it} className="flex items-start gap-2.5 text-sm font-bold">
                    <Check size={18} className="mt-0.5 shrink-0 text-brand-500" />
                    {it}
                  </li>
                ))}
              </ul>
              {p.price === 'A medida' ? (
                <a
                  href="#contacto"
                  className="slant-both mt-8 border-2 border-ink-950 py-3 text-center text-sm font-extrabold uppercase tracking-wider transition hover:bg-ink-950 hover:text-white"
                >
                  Hablar con ventas
                </a>
              ) : (
                <Link
                  to="/login?modo=registro"
                  className={`slant-both mt-8 py-3.5 text-center text-sm font-extrabold uppercase tracking-wider transition ${
                    p.featured
                      ? 'bg-brand-500 text-ink-950 hover:bg-brand-400'
                      : 'bg-ink-950 text-white hover:bg-ink-900'
                  }`}
                >
                  Empezar con {p.name}
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="bg-ink-50 py-24">
      <div className="mx-auto max-w-3xl px-5">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-600">Preguntas frecuentes</p>
        <h2 className="display mt-3 text-5xl text-ink-950 sm:text-6xl">Resolvemos tus dudas</h2>

        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => {
            const abierto = openIndex === i
            return (
              <div key={f.q} className={`border-l-4 bg-white ${abierto ? 'border-brand-500' : 'border-ink-200'}`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpenIndex(abierto ? null : i)}
                  aria-expanded={abierto}
                >
                  <span className="text-base font-extrabold text-ink-950">{f.q}</span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-brand-600 transition-transform ${abierto ? 'rotate-180' : ''}`}
                  />
                </button>
                {abierto && <p className="px-6 pb-5 leading-relaxed text-ink-700">{f.a}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Contact() {
  const [nombre, setNombre] = useState('')
  const [negocio, setNegocio] = useState('')
  const [mensaje, setMensaje] = useState('')

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    const texto = `Hola, soy ${nombre}${negocio ? ` de ${negocio}` : ''}. ${mensaje}`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer')
  }

  const campo =
    'w-full border-2 border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition placeholder:text-ink-500 focus:border-brand-500'

  return (
    <section id="contacto" className="py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-2">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-600">Contacto</p>
          <h2 className="display mt-3 text-5xl text-ink-950 sm:text-6xl">Hablemos de tu taller</h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-700">
            Cuéntanos cómo trabajas hoy, si tienes taller, almacén o ambos, y te mostramos cómo POSTECH puede ayudarte.
          </p>
          <div className="mt-8 space-y-4">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 font-extrabold text-ink-950 transition hover:text-brand-600"
            >
              <span className="grid h-11 w-11 place-items-center bg-brand-500 text-ink-950">
                <MessageCircle size={20} />
              </span>
              Escríbenos por WhatsApp
            </a>
            <p className="flex items-center gap-3 text-sm font-bold text-ink-500">
              <span className="grid h-11 w-11 place-items-center bg-ink-100 text-ink-700">
                <Users size={20} />
              </span>
              {CONTACT_EMAIL}
            </p>
          </div>
        </div>

        <form onSubmit={enviar} className="space-y-4 border border-ink-200 bg-ink-50 p-7">
          <div>
            <label htmlFor="c-nombre" className="mb-1.5 block text-sm font-extrabold uppercase tracking-wide text-ink-900">
              Tu nombre
            </label>
            <input id="c-nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} placeholder="Carlos Martínez" />
          </div>
          <div>
            <label htmlFor="c-negocio" className="mb-1.5 block text-sm font-extrabold uppercase tracking-wide text-ink-900">
              Tu negocio
            </label>
            <input id="c-negocio" value={negocio} onChange={(e) => setNegocio(e.target.value)} className={campo} placeholder="Taller Moto Veloz" />
          </div>
          <div>
            <label htmlFor="c-mensaje" className="mb-1.5 block text-sm font-extrabold uppercase tracking-wide text-ink-900">
              ¿En qué te ayudamos?
            </label>
            <textarea
              id="c-mensaje"
              required
              rows={4}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              className={campo}
              placeholder="Quiero ver una demostración del sistema…"
            />
          </div>
          <button
            type="submit"
            className="slant-both w-full bg-brand-500 py-3.5 text-sm font-extrabold uppercase tracking-wider text-ink-950 transition hover:bg-brand-400"
          >
            Enviar por WhatsApp
          </button>
        </form>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-ink-950 text-ink-300">
      <div className="checker h-4 w-full" aria-hidden="true" />
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-12 sm:flex-row">
        <Logo tone="light" />
        <p className="text-sm font-semibold">© {new Date().getFullYear()} POSTECH. Todos los derechos reservados.</p>
        <nav className="flex gap-6 text-sm font-bold uppercase tracking-wider" aria-label="Pie">
          <Link to="/login" className="transition hover:text-brand-500">
            Ingresar
          </Link>
          <a href="#precios" className="transition hover:text-brand-500">
            Precios
          </a>
        </nav>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ParaQuien />
        <Features />
        <Cifras />
        <Pricing />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
