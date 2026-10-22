import { supabase } from './supabase'

export type EstadoOrden = 'recibida' | 'diagnostico' | 'reparacion' | 'lista' | 'entregada' | 'cancelada'

/** Orden del flujo normal en el taller. */
export const FLUJO: EstadoOrden[] = ['recibida', 'diagnostico', 'reparacion', 'lista']

export const etiquetaEstado: Record<EstadoOrden, string> = {
  recibida: 'Recibida',
  diagnostico: 'Diagnóstico',
  reparacion: 'Reparación',
  lista: 'Lista',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
}

export const colorEstado: Record<EstadoOrden, string> = {
  recibida: 'bg-ink-100 text-ink-700',
  diagnostico: 'bg-amber-100 text-amber-800',
  reparacion: 'bg-brand-100 text-brand-800',
  lista: 'bg-emerald-100 text-emerald-800',
  entregada: 'bg-ink-950 text-brand-500',
  cancelada: 'bg-red-100 text-red-800',
}

export interface ItemOrden {
  id: string
  tipo: 'repuesto' | 'mano_obra'
  producto_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
  descuento: number
  iva_porcentaje: number
  total: number
}

export interface OrdenCompleta {
  id: string
  numero: number | null
  estado: EstadoOrden
  problema_reportado: string
  diagnostico: string | null
  trabajo_realizado: string | null
  kilometraje_entrada: number | null
  fecha_ingreso: string
  fecha_estimada: string | null
  fecha_entrega: string | null
  total_estimado: number
  venta_id: string | null
  notas: string | null
  mecanico_id: string | null
  mecanico: string | null
  moto: { id: string; placa: string; color: string | null; anio: number | null; modelo: string | null } | null
  cliente: { id: string; nombre: string; documento: string | null; telefono: string | null } | null
  items: ItemOrden[]
}

type Fila = Record<string, unknown>
const num = (v: unknown) => Number(v ?? 0)

/** Trae la orden con su moto, cliente, mecánico e ítems. Devuelve [orden, error]. */
export async function cargarOrden(id: string): Promise<[OrdenCompleta | null, string | null]> {
  const { data, error } = await supabase.from('ordenes_taller').select('*').eq('id', id).maybeSingle()
  if (error) return [null, error.message]
  if (!data) return [null, 'No se encontró la orden (o no tienes acceso a ella).']
  const o = data as Fila

  const [itemsR, motoR, mecR] = await Promise.all([
    supabase.from('orden_items').select('*').eq('orden_id', id).order('created_at', { ascending: true }),
    supabase.from('motos').select('id, placa, color, anio, cliente_id, modelos_moto ( marca, modelo )').eq('id', o.moto_id as string).maybeSingle(),
    o.mecanico_id
      ? supabase.from('perfiles').select('nombre_completo').eq('id', o.mecanico_id as string).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (itemsR.error) return [null, itemsR.error.message]

  const m = motoR.data as unknown as
    | { id: string; placa: string; color: string | null; anio: number | null; cliente_id: string | null; modelos_moto: { marca: string; modelo: string } | { marca: string; modelo: string }[] | null }
    | null
  const mod = m ? (Array.isArray(m.modelos_moto) ? m.modelos_moto[0] : m.modelos_moto) : null
  const clienteId = (o.cliente_id as string | null) ?? m?.cliente_id ?? null
  const clienteR = clienteId
    ? await supabase.from('clientes').select('id, nombre, documento, telefono').eq('id', clienteId).maybeSingle()
    : { data: null }

  return [
    {
      id: o.id as string,
      numero: o.numero === null ? null : num(o.numero),
      estado: o.estado as EstadoOrden,
      problema_reportado: o.problema_reportado as string,
      diagnostico: (o.diagnostico as string | null) ?? null,
      trabajo_realizado: (o.trabajo_realizado as string | null) ?? null,
      kilometraje_entrada: o.kilometraje_entrada === null ? null : num(o.kilometraje_entrada),
      fecha_ingreso: o.fecha_ingreso as string,
      fecha_estimada: (o.fecha_estimada as string | null) ?? null,
      fecha_entrega: (o.fecha_entrega as string | null) ?? null,
      total_estimado: num(o.total_estimado),
      venta_id: (o.venta_id as string | null) ?? null,
      notas: (o.notas as string | null) ?? null,
      mecanico_id: (o.mecanico_id as string | null) ?? null,
      mecanico: (mecR.data as { nombre_completo: string } | null)?.nombre_completo || null,
      moto: m ? { id: m.id, placa: m.placa, color: m.color, anio: m.anio, modelo: mod ? `${mod.marca} ${mod.modelo}` : null } : null,
      cliente: (clienteR.data as OrdenCompleta['cliente']) ?? null,
      items: ((itemsR.data ?? []) as Fila[]).map((i) => ({
        id: i.id as string,
        tipo: i.tipo as ItemOrden['tipo'],
        producto_id: (i.producto_id as string | null) ?? null,
        descripcion: i.descripcion as string,
        cantidad: num(i.cantidad),
        precio_unitario: num(i.precio_unitario),
        descuento: num(i.descuento),
        iva_porcentaje: num(i.iva_porcentaje),
        total: num(i.total),
      })),
    },
    null,
  ]
}

export interface Mecanico {
  id: string
  nombre_completo: string
}

/** Personas que pueden recibir órdenes: mecánicos activos del negocio. */
export async function listarMecanicos(): Promise<Mecanico[]> {
  const { data } = await supabase.from('perfiles').select('id, nombre_completo').eq('rol', 'mecanico').eq('activo', true).order('nombre_completo')
  return (data ?? []) as Mecanico[]
}
