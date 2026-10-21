import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

// Si faltan las variables, usamos valores de relleno para que la app cargue
// (la landing funciona igual) y el login muestre un aviso claro.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
)

const traducciones: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
  [/email not confirmed/i, 'Debes confirmar tu correo antes de iniciar sesión.'],
  [/user already registered/i, 'Ya existe una cuenta con este correo.'],
  [/password should be at least/i, 'La contraseña debe tener al menos 6 caracteres.'],
  [/unable to validate email/i, 'El correo no es válido.'],
  [/rate limit|too many requests/i, 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'],
  [/failed to fetch|network/i, 'No hay conexión con el servidor. Revisa tu internet.'],
  [/same password/i, 'La nueva contraseña debe ser distinta a la anterior.'],
]

export function traducirError(message: string): string {
  for (const [patron, texto] of traducciones) {
    if (patron.test(message)) return texto
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
}

/**
 * Errores de las funciones de la base de datos (registrar_venta, anular_venta…): sus mensajes
 * ya están en español y dicen qué pasó ("Stock insuficiente de…"), así que se muestran tal cual.
 */
export function mensajeFuncion(err: { message?: string; code?: string }): string {
  if ((err.code === 'P0001' || err.code === '42501') && err.message) return err.message
  return traducirError(err.message ?? '')
}
