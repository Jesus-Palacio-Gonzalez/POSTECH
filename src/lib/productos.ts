export interface Producto {
  id: string
  sku: string
  nombre: string
  marca: string | null
  unidad: string
  es_servicio: boolean
  precio_venta: number | string
  iva_porcentaje: number | string
  stock_actual: number | string
  codigo_barras: string | null
  ubicacion: string | null
}

/** Fila completa de `productos` (la usa Inventario). */
export interface ProductoCompleto extends Producto {
  categoria_id: string | null
  descripcion: string | null
  precio_costo: number | string
  stock_minimo: number | string
  activo: boolean
}

export interface Categoria {
  id: string
  nombre: string
}

export interface ModeloMoto {
  id: string
  marca: string
  modelo: string
  cilindraje: number | null
}

export const nombreModelo = (m: Pick<ModeloMoto, 'marca' | 'modelo'>) => `${m.marca} ${m.modelo}`
