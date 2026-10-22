import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { nombreModelo } from '../lib/productos'
import type { Categoria, ModeloMoto, ProductoCompleto } from '../lib/productos'
import { mensajeFuncion, supabase } from '../lib/supabase'
import { entrada } from '../lib/ui'

interface Props {
  producto: ProductoCompleto | null
  categorias: Categoria[]
  modelos: ModeloMoto[]
  onGuardado: () => void
  onCerrar: () => void
  onCategoriaCreada: (c: Categoria) => void
}

const IVAS = ['0', '5', '19']

/** Crear o editar un producto. El stock existente solo se cambia con "Ajustar stock". */
export function ProductoForm({ producto, categorias, modelos, onGuardado, onCerrar, onCategoriaCreada }: Props) {
  const editando = !!producto
  const [f, setF] = useState({
    sku: producto?.sku ?? '',
    nombre: producto?.nombre ?? '',
    marca: producto?.marca ?? '',
    categoria_id: producto?.categoria_id ?? '',
    unidad: producto?.unidad ?? 'und',
    es_servicio: producto?.es_servicio ?? false,
    codigo_barras: producto?.codigo_barras ?? '',
    precio_costo: String(Number(producto?.precio_costo ?? 0)),
    precio_venta: String(Number(producto?.precio_venta ?? 0)),
    iva: String(Number(producto?.iva_porcentaje ?? 19)),
    stock_inicial: '0',
    stock_minimo: String(Number(producto?.stock_minimo ?? 0)),
    ubicacion: producto?.ubicacion ?? '',
    descripcion: producto?.descripcion ?? '',
    activo: producto?.activo ?? true,
  })
  const [compat, setCompat] = useState<Set<string>>(new Set())
  const [compatInicial, setCompatInicial] = useState<Set<string>>(new Set())
  const [buscaModelo, setBuscaModelo] = useState('')
  const [nuevaCat, setNuevaCat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!producto) return
    void supabase
      .from('producto_compatibilidad')
      .select('modelo_id')
      .eq('producto_id', producto.id)
      .then(({ data }) => {
        const ids = new Set(((data ?? []) as Array<{ modelo_id: string }>).map((x) => x.modelo_id))
        setCompat(ids)
        setCompatInicial(ids)
      })
  }, [producto])

  const modelosVisibles = useMemo(() => {
    const q = buscaModelo.trim().toLowerCase()
    return q ? modelos.filter((m) => nombreModelo(m).toLowerCase().includes(q)) : modelos
  }, [modelos, buscaModelo])

  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }))
  const margen = Number(f.precio_venta) > 0 && Number(f.precio_costo) > 0 ? Math.round((1 - Number(f.precio_costo) / Number(f.precio_venta)) * 100) : null

  async function crearCategoria() {
    const nombre = nuevaCat.trim()
    if (!nombre) return
    const { data, error: err } = await supabase.from('categorias').insert({ nombre }).select('id, nombre').single()
    if (err) {
      setError(err.code === '23505' ? 'Ya existe una categoría con ese nombre.' : mensajeFuncion(err))
      return
    }
    onCategoriaCreada(data as Categoria)
    set('categoria_id', (data as Categoria).id)
    setNuevaCat('')
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setGuardando(true)
    const base = {
      sku: f.sku.trim(),
      nombre: f.nombre.trim(),
      marca: f.marca.trim() || null,
      categoria_id: f.categoria_id || null,
      unidad: f.unidad.trim() || 'und',
      codigo_barras: f.codigo_barras.trim() || null,
      precio_costo: Number(f.precio_costo) || 0,
      precio_venta: Number(f.precio_venta) || 0,
      iva_porcentaje: Math.min(100, Math.max(0, Number(f.iva) || 0)),
      stock_minimo: f.es_servicio ? 0 : Number(f.stock_minimo) || 0,
      ubicacion: f.ubicacion.trim() || null,
      descripcion: f.descripcion.trim() || null,
      activo: f.activo,
    }
    let id = producto?.id ?? ''
    if (editando) {
      const { error: err } = await supabase.from('productos').update(base).eq('id', id)
      if (err) return fallo(err)
    } else {
      const { data, error: err } = await supabase
        .from('productos')
        .insert({ ...base, es_servicio: f.es_servicio, stock_actual: f.es_servicio ? 0 : Number(f.stock_inicial) || 0 })
        .select('id')
        .single()
      if (err) return fallo(err)
      id = (data as { id: string }).id
    }
    // Compatibilidad: solo se tocan las diferencias
    const agregar = [...compat].filter((m) => !compatInicial.has(m))
    const quitar = [...compatInicial].filter((m) => !compat.has(m))
    if (agregar.length) {
      const { error: err } = await supabase.from('producto_compatibilidad').insert(agregar.map((modelo_id) => ({ producto_id: id, modelo_id })))
      if (err) return fallo(err)
    }
    if (quitar.length) {
      const { error: err } = await supabase.from('producto_compatibilidad').delete().eq('producto_id', id).in('modelo_id', quitar)
      if (err) return fallo(err)
    }
    setGuardando(false)
    onGuardado()
  }

  function fallo(err: { message?: string; code?: string }) {
    setGuardando(false)
    setError(err.code === '23505' ? 'Ya existe un producto con esa referencia o ese código de barras.' : mensajeFuncion(err))
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink-950/70 p-4" role="dialog" aria-modal="true" aria-label={editando ? 'Editar producto' : 'Nuevo producto'}>
      <form onSubmit={guardar} className="my-4 w-full max-w-2xl bg-white">
        <div className="flex items-center justify-between bg-ink-950 px-5 py-3 text-white">
          <p className="display text-xl">{editando ? 'Editar producto' : 'Nuevo producto'}</p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="hover:text-brand-500"><X size={20} /></button>
        </div>
        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Referencia (SKU)</span>
              <input required value={f.sku} onChange={(e) => set('sku', e.target.value)} className={entrada} /></label>
            <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Nombre</span>
              <input required value={f.nombre} onChange={(e) => set('nombre', e.target.value)} className={entrada} /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Marca</span>
              <input value={f.marca} onChange={(e) => set('marca', e.target.value)} className={entrada} /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Código de barras</span>
              <input value={f.codigo_barras} onChange={(e) => set('codigo_barras', e.target.value)} className={entrada} /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Unidad</span>
              <input value={f.unidad} onChange={(e) => set('unidad', e.target.value)} className={entrada} placeholder="und, lt, par…" /></label>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Categoría</span>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Categoría" value={f.categoria_id} onChange={(e) => set('categoria_id', e.target.value)} className={`${entrada} sm:w-64`}>
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <input aria-label="Nueva categoría" value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} placeholder="Nueva categoría" className={`${entrada} sm:w-48`} />
              <button type="button" onClick={() => void crearCategoria()} className="border-2 border-ink-950 px-3 text-xs font-extrabold uppercase hover:bg-ink-100">Crear</button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={f.es_servicio} disabled={editando} onChange={(e) => set('es_servicio', e.target.checked)} className="h-4 w-4 accent-brand-500" />
            Es un servicio (mano de obra, no maneja stock){editando && <span className="text-xs font-semibold text-ink-500"> — no se puede cambiar después</span>}
          </label>

          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Costo</span>
              <input type="number" min="0" value={f.precio_costo} onChange={(e) => set('precio_costo', e.target.value)} className={entrada} /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Precio de venta</span>
              <input required type="number" min="0" value={f.precio_venta} onChange={(e) => set('precio_venta', e.target.value)} className={entrada} /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">IVA incluido (%)</span>
              <input list="ivas" type="number" min="0" max="100" value={f.iva} onChange={(e) => set('iva', e.target.value)} className={entrada} />
              <datalist id="ivas">{IVAS.map((v) => <option key={v} value={v} />)}</datalist></label>
            <div className="flex items-end pb-2 text-xs font-bold text-ink-500">{margen !== null ? `Margen ${margen}%` : ''}</div>
          </div>

          {!f.es_servicio && (
            <div className="grid gap-3 sm:grid-cols-3">
              {!editando && (
                <label className="block"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Stock inicial</span>
                  <input type="number" min="0" step="any" value={f.stock_inicial} onChange={(e) => set('stock_inicial', e.target.value)} className={entrada} /></label>
              )}
              <label className="block"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Stock mínimo</span>
                <input type="number" min="0" step="any" value={f.stock_minimo} onChange={(e) => set('stock_minimo', e.target.value)} className={entrada} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Ubicación</span>
                <input value={f.ubicacion} onChange={(e) => set('ubicacion', e.target.value)} placeholder="Estante A2" className={entrada} /></label>
            </div>
          )}
          {editando && !f.es_servicio && <p className="-mt-3 text-xs font-semibold text-ink-500">Para cambiar las existencias usa «Ajustar stock»: así queda registrado el movimiento.</p>}

          <label className="block"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">Descripción</span>
            <textarea rows={2} value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} className={entrada} /></label>

          {!f.es_servicio && (
            <fieldset className="border-2 border-ink-200 p-3">
              <legend className="px-2 text-xs font-extrabold uppercase tracking-wide">Compatible con ({compat.size})</legend>
              <input aria-label="Buscar modelo" value={buscaModelo} onChange={(e) => setBuscaModelo(e.target.value)} placeholder="Buscar modelo de moto" className={`${entrada} mb-2`} />
              <div className="grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2">
                {modelosVisibles.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={compat.has(m.id)} onChange={(e) => setCompat((s) => { const n = new Set(s); if (e.target.checked) n.add(m.id); else n.delete(m.id); return n })} className="h-4 w-4 accent-brand-500" />
                    {nombreModelo(m)}{m.cilindraje ? ` ${m.cilindraje}` : ''}
                  </label>
                ))}
                {modelosVisibles.length === 0 && <p className="text-xs font-semibold text-ink-500">No hay modelos con esa búsqueda.</p>}
              </div>
            </fieldset>
          )}

          {editando && (
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={f.activo} onChange={(e) => set('activo', e.target.checked)} className="h-4 w-4 accent-brand-500" />
              Activo (los productos inactivos no aparecen en el Mostrador)
            </label>
          )}

          {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{error}</p>}
          <div className="flex gap-3">
            <button disabled={guardando} className="flex-1 bg-brand-500 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600 disabled:opacity-60">
              {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear producto'}
            </button>
            <button type="button" onClick={onCerrar} className="border-2 border-ink-950 px-5 py-3 text-sm font-extrabold uppercase tracking-wide">Cancelar</button>
          </div>
        </div>
      </form>
    </div>
  )
}
