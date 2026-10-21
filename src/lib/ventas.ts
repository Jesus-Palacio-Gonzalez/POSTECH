import { supabase } from './supabase'

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'credito'

export const etiquetaMetodo: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  credito: 'Crédito',
}

export interface ItemVenta {
  id: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  descuento: number
  iva_porcentaje: number
  total: number
}

export interface VentaCompleta {
  id: string
  numero: number | null
  created_at: string
  estado: 'completada' | 'anulada'
  metodo_pago: MetodoPago
  subtotal: number
  descuento: number
  impuesto: number
  total: number
  pagado: number
  notas: string | null
  motivo_anulacion: string | null
  vendedor: string | null
  cliente: { nombre: string; documento: string | null; telefono: string | null } | null
  items: ItemVenta[]
}

type Fila = Record<string, unknown>
const num = (v: unknown) => Number(v ?? 0)

/** Trae una venta con sus ítems, cliente y vendedor. Devuelve [venta, error]. */
export async function cargarVenta(id: string): Promise<[VentaCompleta | null, string | null]> {
  const { data: v, error } = await supabase.from('ventas').select('*').eq('id', id).maybeSingle()
  if (error) return [null, error.message]
  if (!v) return [null, 'No se encontró la venta.']
  const venta = v as Fila

  const [itemsR, clienteR, vendedorR] = await Promise.all([
    supabase.from('venta_items').select('*').eq('venta_id', id).order('linea', { ascending: true }),
    venta.cliente_id
      ? supabase.from('clientes').select('nombre, documento, telefono').eq('id', venta.cliente_id as string).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    venta.vendedor_id
      ? supabase.from('perfiles').select('nombre_completo').eq('id', venta.vendedor_id as string).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (itemsR.error) return [null, itemsR.error.message]

  return [
    {
      id: venta.id as string,
      numero: venta.numero === null ? null : num(venta.numero),
      created_at: venta.created_at as string,
      estado: venta.estado as VentaCompleta['estado'],
      metodo_pago: venta.metodo_pago as MetodoPago,
      subtotal: num(venta.subtotal),
      descuento: num(venta.descuento),
      impuesto: num(venta.impuesto),
      total: num(venta.total),
      pagado: num(venta.pagado),
      notas: (venta.notas as string | null) ?? null,
      motivo_anulacion: (venta.motivo_anulacion as string | null) ?? null,
      vendedor: (vendedorR.data as { nombre_completo: string } | null)?.nombre_completo || null,
      cliente: (clienteR.data as VentaCompleta['cliente']) ?? null,
      items: ((itemsR.data ?? []) as Fila[]).map((i) => ({
        id: i.id as string,
        descripcion: i.descripcion as string,
        cantidad: num(i.cantidad),
        precio_unitario: num(i.precio_unitario),
        descuento: num(i.descuento),
        iva_porcentaje: num(i.iva_porcentaje),
        total: num(i.total) || Math.round((num(i.cantidad) * num(i.precio_unitario) - num(i.descuento)) * 100) / 100,
      })),
    },
    null,
  ]
}
