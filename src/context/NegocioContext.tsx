import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase, traducirError } from '../lib/supabase'
import { useAuth } from './AuthContext'

/** Coincide con el enum `rol_usuario` de supabase/schema.sql */
export type Rol = 'dueno' | 'admin' | 'cajero' | 'mecanico'

export interface Negocio {
  id: string
  nombre: string
  ciudad: string | null
  razon_social: string | null
  nit: string | null
  regimen: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  logo_url: string | null
  pie_comprobante: string | null
}

/** Campos fiscales y de contacto que el dueño o administrador puede editar. */
export type DatosFiscales = Partial<Omit<Negocio, 'id'>>

export const etiquetaRol: Record<Rol, string> = {
  dueno: 'Dueño',
  admin: 'Administrador',
  cajero: 'Cajero',
  mecanico: 'Mecánico',
}

interface NegocioState {
  negocio: Negocio | null
  rol: Rol | null
  nombreCompleto: string | null
  cargando: boolean
  /** Error al consultar la base de datos (p. ej. si aún no se ejecutó el SQL). */
  error: string | null
  /** Código y mensaje originales de Supabase, para diagnóstico. */
  errorTecnico: string | null
  recargar: () => Promise<void>
  /** Cambia el nombre del negocio (solo dueño y administrador). Devuelve un error o null. */
  renombrar: (nombre: string) => Promise<string | null>
  /** Guarda los datos del comprobante. Devuelve un error o null. */
  guardarDatos: (datos: DatosFiscales) => Promise<string | null>
  /** Sube el logo (PNG/JPG/WebP, máx. 1 MB) y lo deja como logo del negocio. */
  subirLogo: (archivo: Blob) => Promise<string | null>
}

const NegocioContext = createContext<NegocioState | undefined>(undefined)

interface FilaPerfil {
  rol: Rol
  nombre_completo: string
  negocios: Negocio | Negocio[] | null
}

function mensajeDeError(err: { message?: string; code?: string }): string {
  const msg = err.message ?? ''
  // Primero las columnas: "column x does not exist" también contiene "does not exist"
  if (err.code === '42703' || err.code === 'PGRST204' || /column .* does not exist|could not find the '.*' column/i.test(msg)) {
    return 'Faltan columnas nuevas en la base de datos: vuelve a ejecutar supabase/schema.sql completo en el SQL Editor de Supabase y revisa que termine sin errores.'
  }
  if (err.code === '42P01' || err.code === 'PGRST205' || /could not find the table|relation .* does not exist/i.test(msg)) {
    return 'La base de datos aún no está configurada. Ejecuta el archivo supabase/schema.sql en el SQL Editor de Supabase.'
  }
  return traducirError(msg)
}

export function NegocioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [rol, setRol] = useState<Rol | null>(null)
  const [nombreCompleto, setNombreCompleto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorTecnico, setErrorTecnico] = useState<string | null>(null)
  // Para qué usuario ya se consultó el negocio (evita parpadear "sin negocio" mientras carga).
  const [cargadoPara, setCargadoPara] = useState<string | null>(null)
  // Solo la primera carga bloquea la pantalla; las recargas (p. ej. tras guardar) no desmontan nada
  const cargando = userId !== null && cargadoPara !== userId

  const cargar = useCallback(async () => {
    if (!userId) {
      setNegocio(null)
      setRol(null)
      setNombreCompleto(null)
      setError(null)
      setCargadoPara(null)
      return
    }
    // El negocio y el perfil los crea el trigger `handle_new_user` al registrarse.
    const { data, error: err } = await supabase
      .from('perfiles')
      .select('rol, nombre_completo, negocios ( id, nombre, ciudad, razon_social, nit, regimen, direccion, telefono, email, logo_url, pie_comprobante )')
      .eq('id', userId)
      .eq('activo', true)
      .maybeSingle()

    if (err) {
      setError(mensajeDeError(err))
      setErrorTecnico(`${err.code ?? 'sin código'}: ${err.message}`)
      setNegocio(null)
      setRol(null)
      setNombreCompleto(null)
    } else {
      setError(null)
      setErrorTecnico(null)
      const fila = data as unknown as FilaPerfil | null
      const n = fila ? (Array.isArray(fila.negocios) ? fila.negocios[0] : fila.negocios) : null
      setNegocio(n ?? null)
      setRol(n && fila ? fila.rol : null)
      setNombreCompleto(n && fila ? fila.nombre_completo : null)
    }
    setCargadoPara(userId)
  }, [userId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar()
  }, [cargar])

  const renombrar = useCallback(
    async (nombre: string): Promise<string | null> => {
      if (!negocio) return 'No hay negocio activo.'
      const limpio = nombre.trim()
      if (!limpio) return 'Escribe un nombre para el negocio.'
      const { data, error: err } = await supabase.from('negocios').update({ nombre: limpio }).eq('id', negocio.id).select('id')
      if (err) return mensajeDeError(err)
      // RLS no da error si no te deja editar: simplemente no actualiza filas
      if (!data || data.length === 0) return 'Solo el dueño o un administrador puede cambiar el nombre.'
      await cargar()
      return null
    },
    [negocio, cargar],
  )

  const guardarDatos = useCallback(
    async (datos: DatosFiscales): Promise<string | null> => {
      if (!negocio) return 'No hay negocio activo.'
      if (datos.nombre !== undefined && !datos.nombre.trim()) return 'El nombre del negocio no puede quedar vacío.'
      // Texto vacío -> null, para no guardar cadenas en blanco
      const limpio = Object.fromEntries(
        Object.entries(datos).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]),
      )
      if (datos.nombre !== undefined) limpio.nombre = datos.nombre.trim()
      const { data, error: err } = await supabase.from('negocios').update(limpio).eq('id', negocio.id).select('id')
      if (err) return mensajeDeError(err)
      if (!data || data.length === 0) return 'Solo el dueño o un administrador puede cambiar estos datos.'
      await cargar()
      return null
    },
    [negocio, cargar],
  )

  const subirLogo = useCallback(
    async (archivo: Blob): Promise<string | null> => {
      if (!negocio) return 'No hay negocio activo.'
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(archivo.type)) return 'El logo debe ser PNG, JPG o WebP.'
      if (archivo.size > 1024 * 1024) return 'El logo pesa más de 1 MB.'
      const ext = archivo.type === 'image/png' ? 'png' : archivo.type === 'image/webp' ? 'webp' : 'jpg'
      // Nombre nuevo cada vez para que el navegador no muestre el logo anterior en caché
      const ruta = `${negocio.id}/logo-${Date.now()}.${ext}`
      const { error: errSubida } = await supabase.storage.from('logos').upload(ruta, archivo, { contentType: archivo.type })
      if (errSubida) {
        return /bucket not found/i.test(errSubida.message)
          ? 'Falta el bucket de logos: vuelve a ejecutar supabase/schema.sql en Supabase.'
          : traducirError(errSubida.message)
      }
      const { data } = supabase.storage.from('logos').getPublicUrl(ruta)
      return guardarDatos({ logo_url: data.publicUrl })
    },
    [negocio, guardarDatos],
  )

  const value = useMemo<NegocioState>(
    () => ({ negocio, rol, nombreCompleto, cargando, error, errorTecnico, recargar: cargar, renombrar, guardarDatos, subirLogo }),
    [negocio, rol, nombreCompleto, cargando, error, errorTecnico, cargar, renombrar, guardarDatos, subirLogo],
  )

  return <NegocioContext.Provider value={value}>{children}</NegocioContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNegocio(): NegocioState {
  const ctx = useContext(NegocioContext)
  if (!ctx) throw new Error('useNegocio debe usarse dentro de <NegocioProvider>')
  return ctx
}
