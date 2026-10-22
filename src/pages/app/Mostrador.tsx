import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Minus, PackageX, Plus, Search, ShoppingCart, Trash2, Wrench, X } from 'lucide-react'
import { ComprobanteModal } from '../../components/Comprobante'
import { useNegocio } from '../../context/NegocioContext'
import { problemaLinea, totalLinea, totales } from '../../lib/carrito'
import type { LineaCarrito } from '../../lib/carrito'
import { cantidad, cop } from '../../lib/formato'
import { mensajeFuncion, supabase } from '../../lib/supabase'
import { cargarVenta, etiquetaMetodo } from '../../lib/ventas'
import type { Cliente } from '../../components/ClienteSelector'
import { ClienteSelector } from '../../components/ClienteSelector'
import type { Producto } from '../../lib/productos'
import { entrada } from '../../lib/ui'
import type { MetodoPago, VentaCompleta } from '../../lib/ventas'

const metodos: MetodoPago[] = ['efectivo', 'tarjeta', 'transferencia', 'credito']

export default function Mostrador() {
  const { rol } = useNegocio()
  const esAdmin = rol === 'dueno' || rol === 'admin'
  const puedeVender = esAdmin || rol === 'cajero'

  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<Producto[]>([])
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [carrito, setCarrito] = useState<LineaCarrito[]>([])
  const [descuentoGlobal, setDescuentoGlobal] = useState(0)
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [abono, setAbono] = useState(0)
  const [notas, setNotas] = useState('')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [cobrando, setCobrando] = useState(false)
  const [errorCobro, setErrorCobro] = useState<string | null>(null)
  const [venta, setVenta] = useState<VentaCompleta | null>(null)
  const [libre, setLibre] = useState(false)
  const buscador = useRef<HTMLInputElement>(null)

  // ---------- Búsqueda de productos (con pequeña espera mientras se escribe) ----------
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!puedeVender) return
    let vigente = true
    const espera = setTimeout(async () => {
      setBuscando(true)
      const { data, error } = await supabase.rpc('buscar_productos', { p_texto: texto, p_limite: 24 })
      if (!vigente) return
      setBuscando(false)
      if (error) {
        setErrorBusqueda(mensajeFuncion(error))
        setResultados([])
      } else {
        setErrorBusqueda(null)
        setResultados((data ?? []) as Producto[])
      }
    }, 250)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [texto, version, puedeVender])

  // ---------- Carrito ----------
  const agregar = useCallback((p: Producto) => {
    const stock = p.es_servicio ? null : Number(p.stock_actual)
    setCarrito((c) => {
      const i = c.findIndex((l) => l.producto_id === p.id)
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + 1, stock } : l))
      return [
        ...c,
        {
          key: p.id,
          producto_id: p.id,
          descripcion: p.nombre,
          sku: p.sku,
          unidad: p.unidad,
          stock,
          cantidad: 1,
          precio: Number(p.precio_venta),
          iva: Number(p.iva_porcentaje),
          descuento: 0,
        },
      ]
    })
    setErrorCobro(null)
  }, [])

  const cambiar = (key: string, cambio: Partial<LineaCarrito>) =>
    setCarrito((c) => c.map((l) => (l.key === key ? { ...l, ...cambio } : l)))
  const quitar = (key: string) => setCarrito((c) => c.filter((l) => l.key !== key))

  // Enter en el buscador: agrega si hay una coincidencia exacta (código de barras / referencia) o un solo resultado
  function alEnter(e: FormEvent) {
    e.preventDefault()
    const t = texto.trim().toLowerCase()
    const exacto = resultados.find((p) => p.codigo_barras === texto.trim() || p.sku.toLowerCase() === t)
    const elegido = exacto ?? (resultados.length === 1 ? resultados[0] : undefined)
    if (elegido && (elegido.es_servicio || Number(elegido.stock_actual) > 0)) {
      agregar(elegido)
      setTexto('')
    }
  }

  const t = totales(carrito, esAdmin ? descuentoGlobal : 0)
  const problemas = carrito.map(problemaLinea)
  const hayProblema = problemas.some(Boolean)
  const abonoValido = Math.min(Math.max(abono || 0, 0), t.total)
  const faltaCliente = metodo === 'credito' && !cliente
  const puedeCobrar = carrito.length > 0 && !hayProblema && !faltaCliente && !cobrando

  async function cobrar() {
    setCobrando(true)
    setErrorCobro(null)
    const items = carrito.map((l) => ({
      producto_id: l.producto_id,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precio_unitario: l.precio,
      iva_porcentaje: l.iva,
      descuento: esAdmin ? l.descuento : 0,
    }))
    const { data, error } = await supabase.rpc('registrar_venta', {
      p_items: items,
      p_metodo: metodo,
      p_cliente: cliente?.id ?? null,
      p_descuento: t.descuento,
      p_notas: notas.trim() || null,
      p_pagado: metodo === 'credito' ? abonoValido : null,
    })
    if (error) {
      setCobrando(false)
      setErrorCobro(mensajeFuncion(error))
      setVersion((v) => v + 1) // las existencias pudieron cambiar
      return
    }
    const [completa, errCarga] = await cargarVenta(data as string)
    setCobrando(false)
    if (!completa) {
      setErrorCobro(`La venta se registró, pero no se pudo abrir el comprobante: ${errCarga}. Búscala en Ventas.`)
    } else {
      setVenta(completa)
    }
    setCarrito([])
    setDescuentoGlobal(0)
    setAbono(0)
    setNotas('')
    setCliente(null)
    setMetodo('efectivo')
    setVersion((v) => v + 1)
  }

  if (!puedeVender) {
    return (
      <div className="mx-auto max-w-lg bg-white p-8 text-center">
        <h1 className="display text-4xl text-ink-950">Mostrador</h1>
        <p className="mt-3 font-semibold text-ink-700">Tu rol no incluye registrar ventas. Pídele acceso al dueño o a un administrador.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_26rem]">
        {/* ---------- Productos ---------- */}
        <section aria-label="Productos" className="min-w-0 space-y-4">
          <form onSubmit={alEnter} className="flex gap-2">
            <label className="relative block flex-1">
              <span className="sr-only">Buscar producto</span>
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                ref={buscador}
                autoFocus
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Buscar por nombre, referencia o código de barras"
                className={`${entrada} pl-10`}
              />
            </label>
            <button
              type="button"
              onClick={() => setLibre((v) => !v)}
              className="flex items-center gap-2 border-2 border-ink-950 bg-white px-4 text-xs font-extrabold uppercase tracking-wide hover:bg-ink-100"
            >
              <Wrench size={16} /> Ítem libre
            </button>
          </form>

          {libre && (
            <ItemLibre
              onAgregar={(l) => {
                setCarrito((c) => [...c, l])
                setLibre(false)
              }}
              onCerrar={() => setLibre(false)}
            />
          )}

          {errorBusqueda && <p role="alert" className="text-sm font-bold text-red-700">{errorBusqueda}</p>}

          <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${buscando ? 'opacity-60' : ''}`}>
            {resultados.map((p) => {
              const stock = Number(p.stock_actual)
              const agotado = !p.es_servicio && stock <= 0
              const bajo = !p.es_servicio && stock > 0 && stock <= 3
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={agotado}
                  onClick={() => agregar(p)}
                  className="flex flex-col items-start gap-1 border-t-4 border-brand-500 bg-white p-4 text-left transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:border-ink-300 disabled:opacity-60"
                >
                  <span className="text-[11px] font-bold uppercase tracking-widest text-ink-500">{p.sku}{p.marca ? ` · ${p.marca}` : ''}</span>
                  <span className="font-extrabold leading-snug text-ink-950">{p.nombre}</span>
                  <span className="display mt-1 text-2xl text-ink-950">{cop.format(Number(p.precio_venta))}</span>
                  <span className="text-xs font-bold">
                    {p.es_servicio ? (
                      <span className="text-ink-500">Servicio</span>
                    ) : agotado ? (
                      <span className="inline-flex items-center gap-1 text-red-700"><PackageX size={13} /> Agotado</span>
                    ) : (
                      <span className={bajo ? 'text-amber-700' : 'text-ink-500'}>{cantidad(stock)} {p.unidad} en stock</span>
                    )}
                    {Number(p.iva_porcentaje) > 0 && <span className="ml-2 text-ink-500">IVA {cantidad(Number(p.iva_porcentaje))}%</span>}
                  </span>
                </button>
              )
            })}
          </div>
          {!buscando && !errorBusqueda && resultados.length === 0 && (
            <p className="bg-white px-4 py-8 text-center text-sm font-semibold text-ink-500">
              {texto.trim()
                ? 'No hay productos con esa búsqueda.'
                : 'Todavía no hay productos en el catálogo. Cuando se creen aparecerán aquí; mientras tanto puedes vender con "Ítem libre".'}
            </p>
          )}
        </section>

        {/* ---------- Carrito ---------- */}
        <aside aria-label="Venta actual" className="h-fit space-y-4 bg-white p-5 lg:sticky lg:top-20">
          <h2 className="display flex items-center gap-2 text-2xl text-ink-950">
            <ShoppingCart size={20} className="text-brand-600" /> Venta actual
          </h2>

          {carrito.length === 0 ? (
            <p className="bg-ink-50 px-4 py-6 text-center text-sm font-semibold text-ink-500">Agrega productos para empezar.</p>
          ) : (
            <ul className="space-y-3">
              {carrito.map((l, i) => (
                <li key={l.key} className="border-b border-ink-100 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-extrabold leading-snug text-ink-950">{l.descripcion}</p>
                    <button type="button" aria-label={`Quitar ${l.descripcion}`} onClick={() => quitar(l.key)} className="text-ink-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" aria-label="Menos" onClick={() => cambiar(l.key, { cantidad: Math.max(l.unidad === 'und' ? 1 : 0.001, l.cantidad - 1) })} className="grid h-8 w-8 place-items-center border-2 border-ink-950"><Minus size={14} /></button>
                    <input
                      aria-label={`Cantidad de ${l.descripcion}`}
                      type="number"
                      min="0"
                      step={l.unidad === 'und' ? 1 : 'any'}
                      value={l.cantidad || ''}
                      onChange={(e) => cambiar(l.key, { cantidad: Number(e.target.value) })}
                      className="h-8 w-16 border-2 border-ink-950 text-center text-sm font-bold"
                    />
                    <button type="button" aria-label="Más" onClick={() => cambiar(l.key, { cantidad: l.cantidad + 1 })} className="grid h-8 w-8 place-items-center border-2 border-ink-950"><Plus size={14} /></button>
                    <span className="ml-auto text-sm font-extrabold">{cop.format(totalLinea(l))}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink-500">
                    {esAdmin ? (
                      <>
                        <label className="flex items-center gap-1">Precio
                          <input aria-label={`Precio de ${l.descripcion}`} type="number" min="0" value={l.precio} onChange={(e) => cambiar(l.key, { precio: Number(e.target.value) })} className="w-24 border border-ink-300 px-1.5 py-1 text-right text-ink-950" />
                        </label>
                        <label className="flex items-center gap-1">Desc.
                          <input aria-label={`Descuento de ${l.descripcion}`} type="number" min="0" value={l.descuento || ''} onChange={(e) => cambiar(l.key, { descuento: Number(e.target.value) })} className="w-20 border border-ink-300 px-1.5 py-1 text-right text-ink-950" />
                        </label>
                      </>
                    ) : (
                      <span>{cop.format(l.precio)} c/u</span>
                    )}
                    {l.iva > 0 && <span className="ml-auto">IVA {cantidad(l.iva)}%</span>}
                  </div>
                  {problemas[i] && <p role="alert" className="mt-1 text-xs font-bold text-red-700">{problemas[i]}</p>}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t-2 border-ink-950 pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-bold">{cop.format(t.subtotal)}</span></div>
            {esAdmin && (
              <label className="flex items-center justify-between gap-3">
                <span>Descuento general</span>
                <input aria-label="Descuento general" type="number" min="0" value={descuentoGlobal || ''} onChange={(e) => setDescuentoGlobal(Number(e.target.value))} className="w-28 border border-ink-300 px-2 py-1 text-right font-bold" />
              </label>
            )}
            {t.impuesto > 0 && <div className="flex justify-between text-xs text-ink-500"><span>IVA incluido</span><span>{cop.format(t.impuesto)}</span></div>}
            <div className="flex items-baseline justify-between">
              <span className="display text-xl">Total</span>
              <span className="display text-4xl text-ink-950" aria-live="polite">{cop.format(t.total)}</span>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide">Forma de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {metodos.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={metodo === m}
                  onClick={() => setMetodo(m)}
                  className={`border-2 px-3 py-2 text-xs font-extrabold uppercase tracking-wide ${metodo === m ? 'border-ink-950 bg-ink-950 text-brand-500' : 'border-ink-300 hover:border-ink-950'}`}
                >
                  {etiquetaMetodo[m]}
                </button>
              ))}
            </div>
          </div>

          <ClienteSelector cliente={cliente} onElegir={setCliente} requerido={metodo === 'credito'} />

          {metodo === 'credito' && (
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide">Abono inicial</span>
              <input aria-label="Abono inicial" type="number" min="0" value={abono || ''} onChange={(e) => setAbono(Number(e.target.value))} className={entrada} />
              <span className="mt-1 block text-xs font-semibold text-ink-500">Queda por pagar {cop.format(t.total - abonoValido)}</span>
            </label>
          )}

          <input aria-label="Notas de la venta" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas (opcional)" className={entrada} />

          {faltaCliente && <p className="text-xs font-bold text-amber-700">Una venta a crédito necesita un cliente.</p>}
          {errorCobro && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{errorCobro}</p>}

          <button
            type="button"
            disabled={!puedeCobrar}
            onClick={() => void cobrar()}
            className="w-full bg-brand-500 px-5 py-4 text-base font-extrabold uppercase tracking-wide text-ink-950 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
          >
            {cobrando ? 'Registrando…' : `Cobrar ${cop.format(t.total)}`}
          </button>
        </aside>
      </div>

      {venta && (
        <ComprobanteModal
          venta={venta}
          tituloExito="Venta registrada"
          onClose={() => {
            setVenta(null)
            buscador.current?.focus()
          }}
        />
      )}
    </>
  )
}

function ItemLibre({ onAgregar, onCerrar }: { onAgregar: (l: LineaCarrito) => void; onCerrar: () => void }) {
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [iva, setIva] = useState('0')

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!descripcion.trim() || !(Number(precio) >= 0) || precio === '') return
    onAgregar({
      key: `libre-${Date.now()}`,
      producto_id: null,
      descripcion: descripcion.trim(),
      sku: null,
      unidad: 'und',
      stock: null,
      cantidad: 1,
      precio: Number(precio),
      iva: Math.min(100, Math.max(0, Number(iva) || 0)),
      descuento: 0,
    })
  }

  return (
    <form onSubmit={enviar} className="grid gap-3 border-2 border-ink-950 bg-white p-4 sm:grid-cols-[1fr_9rem_6rem_auto]" aria-label="Ítem libre">
      <input autoFocus required aria-label="Descripción del ítem" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Mano de obra, cambio de aceite" className={entrada} />
      <input required aria-label="Precio del ítem" type="number" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio" className={entrada} />
      <input aria-label="IVA del ítem (%)" type="number" min="0" max="100" value={iva} onChange={(e) => setIva(e.target.value)} placeholder="IVA %" className={entrada} />
      <div className="flex gap-2">
        <button className="bg-ink-950 px-4 text-xs font-extrabold uppercase tracking-wide text-white">Agregar</button>
        <button type="button" onClick={onCerrar} aria-label="Cerrar ítem libre" className="px-2 text-ink-500"><X size={18} /></button>
      </div>
    </form>
  )
}
