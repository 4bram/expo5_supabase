import { supabase } from '../config/supabase.js'

export async function registrarUsuario(
  email,
  password,
  name
) {
  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    })

  if (!error && data.session) {
    await crearPerfilSiNoExiste(data.user, name)
  }

  return {
    data,
    error
  }
}

export async function iniciarSesion(
  email,
  password
) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    })

  if (!error) {
    await crearPerfilSiNoExiste(data.user)
  }
  return {
    data,
    error
  }
}


export async function cerrarSesion() {
  const { error } =
    await supabase.auth.signOut()

  return {
    error
  }
}


export async function obtenerUsuarioActual() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  return {
    user,
    error
  }
}

export async function crearPerfilSiNoExiste(user, name) {
  const nombre =
    name ||
    user.user_metadata?.name ||
    user.email.split('@')[0]

  const { error } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, name: nombre },
      { onConflict: 'id', ignoreDuplicates: true }
    )

  return { error }
}


export async function obtenerPerfil(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', userId)
    .single()

  return { data, error }
}

export async function cambiarContrasena(nuevaContrasena) {
  const { data, error } =
    await supabase.auth.updateUser({
      password: nuevaContrasena
    })

  return { data, error }
}