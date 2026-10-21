export interface LineaCarrito {
  key: string
  producto_id: string | null
  descripcion: string
  sku: string | null
  unidad: string
  /** Existencias al momento de buscar; null para servicios e ítems libres */
  stock: number | null
  cantidad: number
  precio: number
  /** IVA (%) incluido en el precio */
  iva: number
  descuento: number
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export const totalLinea = (l: LineaCarrito) => r2(l.cantidad * l.precio - l.descuento)

/** Misma cuenta que hace registrar_venta en la base de datos (precios con IVA incluido). */
export function totales(lineas: LineaCarrito[], descuentoGlobal: number) {
  const subtotal = r2(lineas.reduce((a, l) => a + totalLinea(l), 0))
  const descuento = Math.min(Math.max(descuentoGlobal || 0, 0), subtotal)
  const total = r2(subtotal - descuento)
  let impuesto = lineas.reduce((a, l) => {
    const t = totalLinea(l)
    return a + (t - t / (1 + l.iva / 100))
  }, 0)
  if (subtotal > 0) impuesto = impuesto * (total / subtotal)
  return { subtotal, descuento, total, impuesto: r2(impuesto) }
}

/** Mensaje si la línea no se puede vender, o null si está bien. */
export function problemaLinea(l: LineaCarrito): string | null {
  if (!(l.cantidad > 0)) return 'Cantidad inválida'
  if (l.precio < 0) return 'Precio inválido'
  if (l.descuento < 0 || totalLinea(l) < 0) return 'El descuento supera el valor'
  if (l.stock !== null && l.cantidad > l.stock) return `Solo hay ${l.stock} en stock`
  return null
}
