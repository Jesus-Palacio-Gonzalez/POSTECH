import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { useNegocio } from '../../context/NegocioContext'

const campo =
  'w-full border-2 border-ink-950 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-brand-500 disabled:bg-ink-100 disabled:text-ink-500'

/** Reduce el logo a 512 px como máximo y lo devuelve como PNG o JPG (pesa mucho menos de 1 MB). */
async function reducirLogo(archivo: File): Promise<Blob> {
  const bmp = await createImageBitmap(archivo)
  const escala = Math.min(1, 512 / Math.max(bmp.width, bmp.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.max(1, Math.round(bmp.width * escala))
  lienzo.height = Math.max(1, Math.round(bmp.height * escala))
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('canvas')
  const jpg = archivo.type === 'image/jpeg'
  if (jpg) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, lienzo.width, lienzo.height)
  }
  ctx.drawImage(bmp, 0, 0, lienzo.width, lienzo.height)
  return await new Promise<Blob>((ok, fallo) =>
    lienzo.toBlob((b) => (b ? ok(b) : fallo(new Error('blob'))), jpg ? 'image/jpeg' : 'image/png', 0.9),
  )
}

export default function Configuracion() {
  const { negocio, rol, guardarDatos, subirLogo } = useNegocio()
  const puede = rol === 'dueno' || rol === 'admin'
  const [form, setForm] = useState({
    nombre: negocio?.nombre ?? '',
    razon_social: negocio?.razon_social ?? '',
    nit: negocio?.nit ?? '',
    regimen: negocio?.regimen ?? '',
    direccion: negocio?.direccion ?? '',
    ciudad: negocio?.ciudad ?? '',
    telefono: negocio?.telefono ?? '',
    email: negocio?.email ?? '',
    pie_comprobante: negocio?.pie_comprobante ?? '',
  })
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setMsg(null)
    const err = await guardarDatos(form)
    setGuardando(false)
    setMsg(err ? { tipo: 'error', texto: err } : { tipo: 'ok', texto: 'Datos guardados. Ya aparecen en tus comprobantes.' })
  }

  async function elegirLogo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(archivo.type)) {
      setMsg({ tipo: 'error', texto: 'El logo debe ser PNG, JPG o WebP.' })
      return
    }
    setSubiendo(true)
    setMsg(null)
    try {
      const err = await subirLogo(await reducirLogo(archivo))
      setMsg(err ? { tipo: 'error', texto: err } : { tipo: 'ok', texto: 'Logo actualizado.' })
    } catch {
      setMsg({ tipo: 'error', texto: 'No se pudo leer la imagen. Prueba con otra.' })
    }
    setSubiendo(false)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="display text-5xl text-ink-950">Configuración</h1>
        <p className="mt-2 font-semibold text-ink-700">
          {puede
            ? 'Estos datos salen en el encabezado de cada comprobante.'
            : 'Solo el dueño o un administrador puede cambiar estos datos.'}
        </p>
      </div>

      <section className="flex flex-wrap items-center gap-5 bg-white p-6" aria-label="Logo">
        <div className="grid h-24 w-24 place-items-center border-2 border-dashed border-ink-300 bg-ink-50">
          {negocio?.logo_url ? (
            <img src={negocio.logo_url} alt="Logo actual" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="text-ink-300" size={30} aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 className="display text-2xl text-ink-950">Logo del negocio</h2>
          <p className="text-sm font-semibold text-ink-500">PNG, JPG o WebP. También se usa como tu avatar en el panel.</p>
          {puede && (
            <>
              <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={elegirLogo} className="sr-only" aria-label="Elegir logo" />
              <button
                type="button"
                disabled={subiendo}
                onClick={() => input.current?.click()}
                className="mt-3 bg-ink-950 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white hover:bg-ink-800 disabled:opacity-60"
              >
                {subiendo ? 'Subiendo…' : negocio?.logo_url ? 'Cambiar logo' : 'Subir logo'}
              </button>
            </>
          )}
        </div>
      </section>

      <form onSubmit={guardar} className="space-y-5 bg-white p-6" aria-label="Datos fiscales">
        <h2 className="display text-2xl text-ink-950">Datos del negocio</h2>
        <fieldset disabled={!puede} className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Nombre comercial</span>
            <input required value={form.nombre} onChange={set('nombre')} className={campo} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Razón social</span>
            <input value={form.razon_social} onChange={set('razon_social')} className={campo} placeholder="Taller Moto Veloz S.A.S." />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">NIT</span>
            <input value={form.nit} onChange={set('nit')} className={campo} placeholder="900123456-7" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Régimen</span>
            <select value={form.regimen} onChange={set('regimen')} className={campo}>
              <option value="">Sin especificar</option>
              <option value="Responsable de IVA">Responsable de IVA</option>
              <option value="No responsable de IVA">No responsable de IVA</option>
              <option value="Régimen simple de tributación">Régimen simple de tributación</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Dirección</span>
            <input value={form.direccion} onChange={set('direccion')} className={campo} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Ciudad</span>
            <input value={form.ciudad} onChange={set('ciudad')} className={campo} placeholder="Santa Marta" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Teléfono</span>
            <input value={form.telefono} onChange={set('telefono')} className={campo} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Correo</span>
            <input type="email" value={form.email} onChange={set('email')} className={campo} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Mensaje al pie del comprobante</span>
            <textarea rows={2} value={form.pie_comprobante} onChange={set('pie_comprobante')} className={campo} placeholder="Garantía de 30 días en mano de obra. ¡Gracias por su compra!" />
          </label>
        </fieldset>

        {msg && (
          <p role={msg.tipo === 'error' ? 'alert' : 'status'} className={`text-sm font-bold ${msg.tipo === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
            {msg.texto}
          </p>
        )}
        {puede && (
          <button disabled={guardando} className="bg-brand-500 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600 disabled:opacity-60">
            {guardando ? 'Guardando…' : 'Guardar datos'}
          </button>
        )}
      </form>
    </div>
  )
}
