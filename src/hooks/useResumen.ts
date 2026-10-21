import { useCallback, useEffect, useState } from 'react'
import { supabase, traducirError } from '../lib/supabase'
import { useNegocio } from '../context/NegocioContext'

export type EstadoOrden = 'recibida' | 'diagnostico' | 'reparacion' | 'lista'

export interface DiaVentas {
  dia: string
  total: number
  hoy: boolean
}

export interface OrdenResumen {
  id: string
  numero: number | null
  placa: string
  moto: string
  trabajo: string
  mecanico: string
  estado: EstadoOrden
}

export interface StockBajo {
  id: string
  nombre: string
  stock: number
  minimo: number
}

export interface Resumen {
  ventasHoy: number
  cantidadVentasHoy: number
  semana: DiaVentas[]
  motosEnTaller: number
  motosListas: number
  ordenes: OrdenResumen[]
  stockBajo: StockBajo[]
  /** El rol puede ver ventas (dueño, admin y cajero). */
  veVentas: boolean
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function inicioDeDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function claveDia(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** Cifras reales del negocio. Todas las consultas respetan RLS: cada rol ve solo lo suyo. */
export function useResumen() {
  const { negocio, rol } = useNegocio()
  const negocioId = negocio?.id ?? null
  const [datos, setDatos] = useState<Resumen | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!negocioId) return
    setCargando(true)
    const hoy = inicioDeDia(new Date())
    const desde = new Date(hoy)
    desde.setDate(desde.getDate() - 6)
    const veVentas = rol === 'dueno' || rol === 'admin' || rol === 'cajero'

    const [ventasR, ordenesR, productosR] = await Promise.all([
      veVentas
        ? supabase
            .from('ventas')
            .select('total, created_at')
            .eq('estado', 'completada')
            .gte('created_at', desde.toISOString())
            .limit(5000)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('ordenes_taller')
        .select('id, numero, estado, problema_reportado, moto_id, mecanico_id, fecha_ingreso')
        .in('estado', ['recibida', 'diagnostico', 'reparacion', 'lista'])
        .order('fecha_ingreso', { ascending: false })
        .limit(100),
      supabase
        .from('productos')
        .select('id, nombre, stock_actual, stock_minimo')
        .eq('activo', true)
        .eq('es_servicio', false)
        .gt('stock_minimo', 0)
        .limit(500),
    ])

    const fallo = ventasR.error ?? ordenesR.error ?? productosR.error
    if (fallo) {
      setError(traducirError(fallo.message))
      setCargando(false)
      return
    }

    // Ventas por día (hora local)
    const porDia = new Map<string, number>()
    let cantidadHoy = 0
    for (const v of (ventasR.data ?? []) as Array<{ total: number | string; created_at: string }>) {
      const f = new Date(v.created_at)
      const k = claveDia(f)
      porDia.set(k, (porDia.get(k) ?? 0) + Number(v.total))
      if (k === claveDia(hoy)) cantidadHoy += 1
    }
    const semana: DiaVentas[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(desde)
      d.setDate(desde.getDate() + i)
      return { dia: DIAS[d.getDay()], total: porDia.get(claveDia(d)) ?? 0, hoy: i === 6 }
    })

    // Órdenes: se completan placa/modelo y mecánico con consultas aparte
    type FilaOrden = {
      id: string
      numero: number | null
      estado: EstadoOrden
      problema_reportado: string
      moto_id: string
      mecanico_id: string | null
    }
    const filas = (ordenesR.data ?? []) as FilaOrden[]
    const recientes = filas.slice(0, 6)
    const motoIds = [...new Set(recientes.map((o) => o.moto_id))]
    const mecIds = [...new Set(recientes.map((o) => o.mecanico_id).filter((x): x is string => !!x))]
    const [motosR, mecR] = await Promise.all([
      motoIds.length
        ? supabase.from('motos').select('id, placa, modelos_moto ( marca, modelo )').in('id', motoIds)
        : Promise.resolve({ data: [], error: null }),
      mecIds.length
        ? supabase.from('perfiles').select('id, nombre_completo').in('id', mecIds)
        : Promise.resolve({ data: [], error: null }),
    ])
    type FilaMoto = { id: string; placa: string; modelos_moto: { marca: string; modelo: string } | { marca: string; modelo: string }[] | null }
    const motos = new Map(((motosR.data ?? []) as unknown as FilaMoto[]).map((m) => [m.id, m]))
    const mecanicos = new Map(((mecR.data ?? []) as Array<{ id: string; nombre_completo: string }>).map((m) => [m.id, m.nombre_completo]))

    const ordenes: OrdenResumen[] = recientes.map((o) => {
      const m = motos.get(o.moto_id)
      const mod = m ? (Array.isArray(m.modelos_moto) ? m.modelos_moto[0] : m.modelos_moto) : null
      return {
        id: o.id,
        numero: o.numero,
        placa: m?.placa ?? '—',
        moto: mod ? `${mod.marca} ${mod.modelo}` : 'Moto sin modelo',
        trabajo: o.problema_reportado,
        mecanico: o.mecanico_id ? (mecanicos.get(o.mecanico_id) || 'Sin nombre') : 'Sin asignar',
        estado: o.estado,
      }
    })

    const stockBajo: StockBajo[] = ((productosR.data ?? []) as Array<{ id: string; nombre: string; stock_actual: number | string; stock_minimo: number | string }>)
      .map((p) => ({ id: p.id, nombre: p.nombre, stock: Number(p.stock_actual), minimo: Number(p.stock_minimo) }))
      .filter((p) => p.stock <= p.minimo)
      .sort((a, b) => a.stock - b.stock)

    setDatos({
      ventasHoy: semana[6].total,
      cantidadVentasHoy: cantidadHoy,
      semana,
      motosEnTaller: filas.length,
      motosListas: filas.filter((o) => o.estado === 'lista').length,
      ordenes,
      stockBajo,
      veVentas,
    })
    setError(null)
    setCargando(false)
  }, [negocioId, rol])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar()
  }, [cargar])

  return { datos, error, cargando, recargar: cargar }
}
