import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  Check,
  ChevronDown,
  Menu,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Store,
  Users,
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

// TODO: reemplazar por el WhatsApp real de POSTECH (solo dígitos, con indicativo de país)
const WHATSAPP_NUMBER = '573000000000'
const CONTACT_EMAIL = 'hola@postech.app'

const navLinks = [
  { href: '#caracteristicas', label: 'Características' },
  { href: '#precios', label: 'Precios' },
  { href: '#faq', label: 'Preguntas' },
  { href: '#contacto', label: 'Contacto' },
]

const features: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: Zap,
    title: 'Cobra en segundos',
    text: 'Una pantalla de venta pensada para la caja: busca, agrega y cobra sin fricción, incluso en horas pico.',
  },
  {
    icon: Boxes,
    title: 'Inventario al día',
    text: 'Cada venta descuenta existencias. Recibe alertas de stock bajo antes de quedarte sin producto.',
  },
  {
    icon: Users,
    title: 'Equipo y roles',
    text: 'Crea usuarios para cajeros, administradores y dueños, cada uno con los permisos que necesita.',
  },
  {
    icon: BarChart3,
    title: 'Reportes claros',
    text: 'Ventas por día, producto y vendedor. Entiende qué se mueve y qué no, sin hojas de cálculo.',
  },
  {
    icon: ReceiptText,
    title: 'Caja y recibos',
    text: 'Apertura y cierre de caja, métodos de pago y comprobantes listos para entregar a tu cliente.',
  },
  {
    icon: ShieldCheck,
    title: 'Datos seguros',
    text: 'Tu información vive en la nube con acceso protegido y copias de respaldo automáticas.',
  },
]

const plans = [
  {
    name: 'Inicio',
    price: '$49.000',
    desc: 'Para tiendas pequeñas que empiezan a ordenar su operación.',
    items: ['1 punto de venta', 'Hasta 2 usuarios', 'Inventario y ventas', 'Reportes básicos'],
    featured: false,
  },
  {
    name: 'Negocio',
    price: '$99.000',
    desc: 'Para negocios en crecimiento que necesitan control total.',
    items: ['3 puntos de venta', 'Hasta 10 usuarios', 'Roles y permisos', 'Reportes avanzados', 'Soporte prioritario'],
    featured: true,
  },
  {
    name: 'Empresa',
    price: 'A medida',
    desc: 'Para cadenas y operaciones con necesidades especiales.',
    items: ['Puntos de venta ilimitados', 'Usuarios ilimitados', 'Integraciones', 'Acompañamiento dedicado'],
    featured: false,
  },
]

const faqs = [
  {
    q: '¿Necesito instalar algo?',
    a: 'No. POSTECH funciona desde el navegador, en computador, tablet o celular. Entras, inicias sesión y vendes.',
  },
  {
    q: '¿Puedo usarlo con varios empleados?',
    a: 'Sí. Puedes crear usuarios con diferentes roles para que cada persona vea y haga solo lo que le corresponde.',
  },
  {
    q: '¿Qué pasa con mi información?',
    a: 'Se guarda en la nube con acceso protegido por usuario y contraseña. Solo tú y tu equipo pueden verla.',
  },
  {
    q: '¿Puedo probarlo antes de pagar?',
    a: 'Sí. Crea tu cuenta gratis y explora el sistema. Si quieres una demostración guiada, escríbenos.',
  },
  {
    q: '¿Sirve para cualquier tipo de negocio?',
    a: 'Está pensado para comercios con venta en mostrador: tiendas, restaurantes, cafeterías, ferreterías y similares.',
  },
]

function Navbar() {
  const [open, setOpen] = useState(false)
  const { session } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#inicio" aria-label="POSTECH, ir al inicio">
          <Logo />
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-semibold text-ink-700 transition hover:text-brand-700">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <Link to="/app" className="rounded-xl bg-ink-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-ink-900">
              Ir al panel
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 text-sm font-bold text-ink-900 transition hover:text-brand-700">
                Iniciar sesión
              </Link>
              <Link
                to="/login?modo=registro"
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
              >
                Empezar gratis
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-ink-900 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-100 bg-white px-5 pb-5 md:hidden">
          <nav className="flex flex-col py-2" aria-label="Móvil">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-ink-100 py-3 text-base font-semibold text-ink-900"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-3">
            <Link to="/login" className="rounded-xl border border-ink-200 py-3 text-center text-sm font-bold">
              Iniciar sesión
            </Link>
            <Link
              to="/login?modo=registro"
              className="rounded-xl bg-brand-600 py-3 text-center text-sm font-bold text-white"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

function DashboardPreview() {
  const bars = [38, 52, 44, 68, 57, 80, 92]
  const dias = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  return (
    <div className="relative mx-auto w-full max-w-lg" aria-hidden="true">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-100 via-brand-50 to-white" />
      <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-[0_30px_80px_-30px_rgba(10,26,33,0.35)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-500">Ventas de hoy</p>
            <p className="text-3xl font-extrabold tracking-tight text-ink-950">$2.480.500</p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">+18,4%</span>
        </div>

        <div className="mt-5 flex h-28 items-end gap-2.5">
          {bars.map((h, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`w-full rounded-lg ${i === bars.length - 1 ? 'bg-brand-600' : 'bg-brand-100'}`}
                style={{ height: `${h}%` }}
              />
              <span className="text-[10px] font-semibold text-ink-500">{dias[i]}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-2.5">
          {[
            { n: 'Café americano x2', v: '$9.000' },
            { n: 'Sándwich de pollo', v: '$16.500' },
            { n: 'Jugo natural 12oz', v: '$8.000' },
          ].map((r) => (
            <div key={r.n} className="flex items-center justify-between rounded-xl bg-ink-50 px-3.5 py-2.5">
              <span className="text-sm font-semibold text-ink-700">{r.n}</span>
              <span className="text-sm font-bold text-ink-950">{r.v}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-950 px-4 py-3">
          <span className="text-sm font-semibold text-ink-200">Total a cobrar</span>
          <span className="text-lg font-extrabold text-white">$33.500</span>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 flex items-center gap-2.5 rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-lg sm:-left-8">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <Boxes size={18} />
        </span>
        <div>
          <p className="text-xs font-semibold text-ink-500">Stock bajo</p>
          <p className="text-sm font-extrabold text-ink-950">3 productos</p>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-5 pb-24 pt-16 lg:grid-cols-2 lg:pt-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-800">
            <Store size={14} /> Punto de venta para negocios modernos
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-950 sm:text-5xl lg:text-6xl">
            Vende más.
            <br />
            Controla <span className="text-brand-600">todo</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-700">
            POSTECH reúne ventas, inventario, equipo y reportes en un sistema simple y rápido, para que dediques tu
            tiempo a hacer crecer tu negocio y no a perseguir números.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login?modo=registro"
              className="rounded-xl bg-brand-600 px-7 py-4 text-center text-base font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700"
            >
              Crear cuenta gratis
            </Link>
            <a
              href="#contacto"
              className="rounded-xl border border-ink-200 bg-white px-7 py-4 text-center text-base font-bold text-ink-900 transition hover:border-ink-300 hover:bg-ink-50"
            >
              Pedir una demo
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-700">
            {['Sin instalación', 'Funciona en cualquier dispositivo', 'Configuración en minutos'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check size={16} className="text-brand-600" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <DashboardPreview />
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="caracteristicas" className="bg-ink-50 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Características</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
            Todo lo que tu mostrador necesita
          </h2>
          <p className="mt-4 text-lg text-ink-700">
            Herramientas esenciales, bien hechas y fáciles de aprender por todo tu equipo.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-ink-100 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-ink-900/5"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon size={22} />
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-ink-950">{title}</h3>
              <p className="mt-2 leading-relaxed text-ink-700">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section id="precios" className="py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Precios</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
            Un plan para cada etapa
          </h2>
          <p className="mt-4 text-lg text-ink-700">Precios mensuales en pesos colombianos. Cambia de plan cuando quieras.</p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <article
              key={p.name}
              className={`relative flex flex-col rounded-3xl border p-8 ${
                p.featured
                  ? 'border-brand-600 bg-ink-950 text-white shadow-2xl shadow-brand-700/20'
                  : 'border-ink-100 bg-white'
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-8 rounded-full bg-brand-500 px-3 py-1 text-xs font-extrabold text-ink-950">
                  Más elegido
                </span>
              )}
              <h3 className="text-xl font-extrabold">{p.name}</h3>
              <p className={`mt-2 text-sm leading-relaxed ${p.featured ? 'text-ink-200' : 'text-ink-700'}`}>{p.desc}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight">{p.price}</span>
                {p.price.startsWith('$') && (
                  <span className={`text-sm font-semibold ${p.featured ? 'text-ink-300' : 'text-ink-500'}`}>/mes</span>
                )}
              </p>
              <ul className="mt-7 flex-1 space-y-3">
                {p.items.map((it) => (
                  <li key={it} className="flex items-start gap-2.5 text-sm font-semibold">
                    <Check size={18} className={`mt-0.5 shrink-0 ${p.featured ? 'text-brand-400' : 'text-brand-600'}`} />
                    {it}
                  </li>
                ))}
              </ul>
              {p.price === 'A medida' ? (
                <a
                  href="#contacto"
                  className="mt-8 rounded-xl border border-ink-200 py-3.5 text-center text-sm font-bold transition hover:bg-ink-50"
                >
                  Hablar con ventas
                </a>
              ) : (
                <Link
                  to="/login?modo=registro"
                  className={`mt-8 rounded-xl py-3.5 text-center text-sm font-bold transition ${
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
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Preguntas frecuentes</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
            Resolvemos tus dudas
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => {
            const abierto = openIndex === i
            return (
              <div key={f.q} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpenIndex(abierto ? null : i)}
                  aria-expanded={abierto}
                >
                  <span className="text-base font-bold text-ink-950">{f.q}</span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-brand-700 transition-transform ${abierto ? 'rotate-180' : ''}`}
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
    'w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition placeholder:text-ink-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-100'

  return (
    <section id="contacto" className="py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Contacto</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
            Hablemos de tu negocio
          </h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-700">
            Cuéntanos cómo vendes hoy y te mostramos cómo POSTECH puede ayudarte. Te respondemos rápido.
          </p>
          <div className="mt-8 space-y-4">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 font-bold text-ink-900 transition hover:text-brand-700"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <MessageCircle size={20} />
              </span>
              Escríbenos por WhatsApp
            </a>
            <p className="pl-14 text-sm font-semibold text-ink-500">{CONTACT_EMAIL}</p>
          </div>
        </div>

        <form onSubmit={enviar} className="space-y-4 rounded-3xl border border-ink-100 bg-ink-50 p-7">
          <div>
            <label htmlFor="c-nombre" className="mb-1.5 block text-sm font-bold text-ink-900">
              Tu nombre
            </label>
            <input id="c-nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} placeholder="María Pérez" />
          </div>
          <div>
            <label htmlFor="c-negocio" className="mb-1.5 block text-sm font-bold text-ink-900">
              Tu negocio
            </label>
            <input id="c-negocio" value={negocio} onChange={(e) => setNegocio(e.target.value)} className={campo} placeholder="Cafetería El Roble" />
          </div>
          <div>
            <label htmlFor="c-mensaje" className="mb-1.5 block text-sm font-bold text-ink-900">
              ¿En qué te ayudamos?
            </label>
            <textarea
              id="c-mensaje"
              required
              rows={4}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              className={campo}
              placeholder="Quiero una demostración del sistema…"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white transition hover:bg-brand-700"
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
    <footer className="border-t border-ink-100 bg-ink-950 py-12 text-ink-300">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 sm:flex-row">
        <Logo tone="light" />
        <p className="text-sm font-semibold">© {new Date().getFullYear()} POSTECH. Todos los derechos reservados.</p>
        <nav className="flex gap-6 text-sm font-semibold" aria-label="Pie">
          <Link to="/login" className="transition hover:text-white">
            Iniciar sesión
          </Link>
          <a href="#precios" className="transition hover:text-white">
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
        <Features />
        <Pricing />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
