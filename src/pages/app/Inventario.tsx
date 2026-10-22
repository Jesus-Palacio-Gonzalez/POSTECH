import { useCallback, useEffect, useMemo, useState } from 'react'
import { PackagePlus, Pencil, Search, SlidersHorizontal } from 'lucide-react'
import { AjusteStock } from '../../components/AjusteStock'
import { ProductoForm } from '../../components/ProductoForm'
import { useNegocio } from '../../context/NegocioContext'
import { cantidad, cop } from '../../lib/formato'
import type { Categoria, ModeloMoto, ProductoCompleto } from '../../lib/productos'
import { mensajeFuncion, supabase } from '../../lib/supabase'
import { entrada } from '../../lib/ui'

type Filtro = 'todos' | 'bajo' | 'agotado' | 'inactivo'

const filtros: Array<{ id: Filtro; texto: string }> = [
  { id: 'todos', texto: 'Activos' },
  { id: 'bajo', texto: 'Stock bajo' },
  { id: 'agotado', texto: 'Agotados' },
  { id: 'inactivo', texto: 'Inactivos' },
]

export default function Inventario() {
  const { rol } = useNegocio()
  const edita = rol === 'dueno' || rol === 'admin'
  const [productos, setProductos] = useState<ProductoCompleto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [modelos, setModelos] = useState<ModeloMoto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [categoria, setCategoria] = useState('')
  const [form, setForm] = useState<{ producto: ProductoCompleto | null } | null>(null)
  const [ajuste, setAjuste] = useState<ProductoCompleto | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [p, c, m] = await Promise.all([
      supabase
        .from('productos')
        .select('id, sku, nombre, marca, unidad, es_servicio, precio_venta, precio_costo, iva_porcentaje, stock_actual, stock_minimo, codigo_barras, ubicacion, categoria_id, descripcion, activo')
        .order('nombre')
        .limit(2000),
      supabase.from('categorias').select('id, nombre').order('nombre'),
      supabase.from('modelos_moto').select('id, marca, modelo, cilindraje').eq('activo', true).order('marca').order('modelo'),
    ])
    const fallo = p.error ?? c.error ?? m.error
    if (fallo) {
      setError(mensajeFuncion(fallo))
      setCargando(false)
      return
    }
    setProductos((p.data ?? []) as ProductoCompleto[])
    setCategorias((c.data ?? []) as Categoria[])
    setModelos((m.data ?? []) as ModeloMoto[])
    setError(null)
    setCargando(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar()
  }, [cargar])

  const nombreCat = useMemo(() => new Map(categorias.map((c) => [c.id, c.nombre])), [categorias])
  const esBajo = (p: ProductoCompleto) => !p.es_servicio && Number(p.stock_minimo) > 0 && Number(p.stock_actual) <= Number(p.stock_minimo)

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    return productos.filter((p) => {
      if (filtro === 'inactivo' ? p.activo : !p.activo) return false
      if (filtro === 'bajo' && !esBajo(p)) return false
      if (filtro === 'agotado' && (p.es_servicio || Number(p.stock_actual) > 0)) return false
      if (categoria && p.categoria_id !== categoria) return false
      if (!t) return true
      return p.nombre.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t) || (p.codigo_barras ?? '') === q.trim() || (p.marca ?? '').toLowerCase().includes(t)
    })
  }, [productos, q, filtro, categoria])

  const activos = productos.filter((p) => p.activo)
  const resumen = {
    total: activos.length,
    bajo: activos.filter(esBajo).length,
    agotados: activos.filter((p) => !p.es_servicio && Number(p.stock_actual) <= 0).length,
    valor: activos.reduce((a, p) => a + (p.es_servicio ? 0 : Math.max(0, Number(p.stock_actual)) * Number(p.precio_costo)), 0),
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl text-ink-950">Inventario</h1>
          <p className="mt-2 font-semibold text-ink-700">{edita ? 'Catálogo, existencias y precios.' : 'Consulta de existencias y precios.'}</p>
        </div>
        {edita && (
          <button type="button" onClick={() => setForm({ producto: null })} className="flex items-center gap-2 bg-brand-500 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-ink-950 hover:bg-brand-600">
            <PackagePlus size={18} /> Nuevo producto
          </button>
        )}
      </div>

      <section className={`grid gap-4 sm:grid-cols-2 ${edita ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`} aria-label="Resumen del inventario">
        {[
          { l: 'Productos activos', v: String(resumen.total) },
          { l: 'Con stock bajo', v: String(resumen.bajo) },
          { l: 'Agotados', v: String(resumen.agotados) },
          ...(edita ? [{ l: 'Valor al costo', v: cop.format(resumen.valor) }] : []),
        ].map((k) => (
          <article key={k.l} className="border-t-4 border-brand-500 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-500">{k.l}</p>
            <p className="display mt-1 text-3xl text-ink-950">{k.v}</p>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block min-w-56 flex-1 sm:max-w-sm">
          <span className="sr-only">Buscar producto</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, referencia, marca o código" className={`${entrada} pl-9`} />
        </label>
        <select aria-label="Filtrar por categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={`${entrada} sm:w-52`}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtro de estado">
          {filtros.map((x) => (
            <button key={x.id} type="button" aria-pressed={filtro === x.id} onClick={() => setFiltro(x.id)} className={`border-2 px-3 py-2 text-xs font-extrabold uppercase tracking-wide ${filtro === x.id ? 'border-ink-950 bg-ink-950 text-brand-500' : 'border-ink-300 bg-white hover:border-ink-950'}`}>
              {x.texto}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p>}

      <div className={`overflow-x-auto bg-white ${cargando ? 'opacity-60' : ''}`}>
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="bg-ink-950 text-xs font-bold uppercase tracking-wider text-ink-300">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-right">Stock</th>
              {edita && <th className="px-4 py-3 text-right">Costo</th>}
              <th className="px-4 py-3 text-right">Precio</th>
              <th className="px-4 py-3 text-right">IVA</th>
              {edita && <th className="w-24" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 font-semibold text-ink-700">
            {visibles.map((p) => {
              const stock = Number(p.stock_actual)
              return (
                <tr key={p.id} className={p.activo ? '' : 'opacity-60'}>
                  <td className="px-4 py-3">
                    <span className="block font-extrabold text-ink-950">{p.nombre}</span>
                    <span className="text-xs text-ink-500">{p.sku}{p.marca ? ` · ${p.marca}` : ''}{p.ubicacion ? ` · ${p.ubicacion}` : ''}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{p.categoria_id ? nombreCat.get(p.categoria_id) ?? '—' : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {p.es_servicio ? (
                      <span className="text-xs text-ink-500">Servicio</span>
                    ) : (
                      <span className={`inline-block px-2.5 py-1 text-xs font-extrabold ${stock <= 0 ? 'bg-red-100 text-red-800' : esBajo(p) ? 'bg-brand-500 text-ink-950' : 'bg-ink-100 text-ink-700'}`}>
                        {cantidad(stock)} {p.unidad}
                      </span>
                    )}
                  </td>
                  {edita && <td className="px-4 py-3 text-right">{cop.format(Number(p.precio_costo))}</td>}
                  <td className="px-4 py-3 text-right font-extrabold text-ink-950">{cop.format(Number(p.precio_venta))}</td>
                  <td className="px-4 py-3 text-right text-xs">{Number(p.iva_porcentaje) > 0 ? `${cantidad(Number(p.iva_porcentaje))}%` : '—'}</td>
                  {edita && (
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" aria-label={`Editar ${p.nombre}`} onClick={() => setForm({ producto: p })} className="p-2 text-ink-500 hover:text-brand-600"><Pencil size={16} /></button>
                        {!p.es_servicio && <button type="button" aria-label={`Ajustar stock de ${p.nombre}`} onClick={() => setAjuste(p)} className="p-2 text-ink-500 hover:text-brand-600"><SlidersHorizontal size={16} /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        {!cargando && visibles.length === 0 && (
          <p className="px-5 py-8 text-center text-sm font-semibold text-ink-500">
            {productos.length === 0 ? (edita ? 'Aún no hay productos. Crea el primero con «Nuevo producto».' : 'Aún no hay productos en el catálogo.') : 'No hay productos con esos filtros.'}
          </p>
        )}
      </div>

      {form && (
        <ProductoForm
          producto={form.producto}
          categorias={categorias}
          modelos={modelos}
          onCategoriaCreada={(c) => setCategorias((x) => [...x, c].sort((a, b) => a.nombre.localeCompare(b.nombre)))}
          onCerrar={() => setForm(null)}
          onGuardado={() => { setForm(null); void cargar() }}
        />
      )}
      {ajuste && <AjusteStock producto={ajuste} onCerrar={() => setAjuste(null)} onHecho={() => { setAjuste(null); void cargar() }} />}
    </div>
  )
}
