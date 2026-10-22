import { createClient } from '@supabase/supabase-js'
import type { Rol } from '../context/NegocioContext'
import { supabase, supabaseAnonKey, supabaseUrl, traducirError } from './supabase'

export interface Miembro {
  id: string
  nombre_completo: string
  telefono: string | null
  rol: Rol
  activo: boolean
}

export interface Invitacion {
  id: string
  email: string
  rol: Rol
  created_at: string
}

export interface NuevoMiembro {
  nombre: string
  telefono: string
  email: string
  clave: string
  rol: Exclude<Rol, 'dueno'>
}

export async function listarEquipo(): Promise<{ miembros: Miembro[]; pendientes: Invitacion[]; error: string | null }> {
  const [m, i] = await Promise.all([
    supabase.from('perfiles').select('id, nombre_completo, telefono, rol, activo').order('nombre_completo'),
    supabase.from('invitaciones').select('id, email, rol, created_at').is('aceptada_en', null).order('created_at', { ascending: false }),
  ])
  const fallo = m.error ?? i.error
  if (fallo) return { miembros: [], pendientes: [], error: traducirError(fallo.message) }
  return { miembros: (m.data ?? []) as Miembro[], pendientes: (i.data ?? []) as Invitacion[], error: null }
}

/**
 * Registra a una persona del equipo con su correo y contraseña.
 * 1) deja una invitación para ese correo (solo dueño/admin pueden, por RLS);
 * 2) crea la cuenta con un cliente aparte que NO guarda sesión (no te saca de la tuya);
 * 3) el trigger `handle_new_user` ve la invitación y la mete a TU negocio con ese rol.
 * No usa la clave service_role: nunca debe estar en el navegador.
 */
export async function registrarMiembro(n: NuevoMiembro): Promise<string | null> {
  const email = n.email.trim().toLowerCase()
  const nombre = n.nombre.trim()
  if (!nombre) return 'Escribe el nombre completo.'
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'El correo no es válido.'
  if (n.clave.length < 6) return 'La contraseña debe tener al menos 6 caracteres.'

  // Si quedó una invitación pendiente de un intento anterior, se reemplaza
  await supabase.from('invitaciones').delete().eq('email', email).is('aceptada_en', null)
  const { data: inv, error: errInv } = await supabase.from('invitaciones').insert({ email, rol: n.rol }).select('id').single()
  if (errInv || !inv) return errInv?.code === '42501' ? 'Solo el dueño o un administrador puede registrar personal.' : traducirError(errInv?.message ?? '')

  const aparte = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await aparte.auth.signUp({ email, password: n.clave, options: { data: { full_name: nombre } } })
  const yaExiste = !error && data.user && (data.user.identities?.length ?? 1) === 0
  if (error || !data.user || yaExiste) {
    await supabase.from('invitaciones').delete().eq('id', inv.id)
    if (yaExiste || (error && /already registered/i.test(error.message))) return 'Ya existe una cuenta con ese correo. Usa otro correo.'
    return traducirError(error?.message ?? '')
  }

  const tel = n.telefono.trim()
  if (tel) await supabase.from('perfiles').update({ telefono: tel }).eq('id', data.user.id)
  return null
}

export async function cambiarActivo(id: string, activo: boolean): Promise<string | null> {
  const { data, error } = await supabase.from('perfiles').update({ activo }).eq('id', id).select('id')
  if (error) return error.message.startsWith('No puedes') || error.message.startsWith('Solo') ? error.message : traducirError(error.message)
  return data && data.length ? null : 'No tienes permiso para este cambio.'
}

export async function cambiarRol(id: string, rol: Rol): Promise<string | null> {
  const { data, error } = await supabase.from('perfiles').update({ rol }).eq('id', id).select('id')
  if (error) return error.message.startsWith('No puedes') || error.message.startsWith('Solo') ? error.message : traducirError(error.message)
  return data && data.length ? null : 'No tienes permiso para este cambio.'
}

export async function cancelarInvitacion(id: string): Promise<string | null> {
  const { error } = await supabase.from('invitaciones').delete().eq('id', id)
  return error ? traducirError(error.message) : null
}
