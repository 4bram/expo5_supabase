import { supabase } from '../config/supabase.js'


// ==========================================
// CRUD NORMAL DE TAREAS
// ==========================================

export async function obtenerTareas() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('id', {
      ascending: true
    })

  return {
    data,
    error
  }
}


export async function crearTarea({
  title,
  description,
  priority,
  userId
}) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      {
        title,
        description,
        priority,
        completed: false,
        user_id: userId
      }
    ])
    .select()

  return {
    data,
    error
  }
}


export async function cambiarEstado(
  id,
  estadoActual
) {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      completed: !estadoActual
    })
    .eq('id', id)
    .select()

  return {
    data,
    error
  }
}


export async function eliminarTarea(id) {
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .select()

  return {
    data,
    error
  }
}


// ==========================================
// PRUEBAS EDUCATIVAS DE RLS POR ID
// ==========================================

export async function buscarTareaPorId(id) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)

  return {
    data,
    error
  }
}


export async function modificarTareaPorId(
  id,
  nuevoTitulo
) {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: nuevoTitulo
    })
    .eq('id', id)
    .select()

  return {
    data,
    error
  }
}


export async function eliminarTareaPorId(id) {
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .select()

  return {
    data,
    error
  }
}

// ==========================================
// COMPARTIR TAREAS
// ==========================================

export async function obtenerPerfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .order('name', {
      ascending: true
    })

  return {
    data,
    error
  }
}


export async function compartirTarea(
  taskId,
  userId
) {
  const { data, error } = await supabase
    .from('task_shares')
    .insert([
      {
        task_id: taskId,
        user_id: userId,
        permission: 'edit'
      }
    ])
    .select()

  return {
    data,
    error
  }
}

// ==========================================
// REALTIME
// ==========================================

export function suscribirseATareas(onCambio) {
  const canal = supabase
    .channel('cambios-tasks')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks'
      },
      payload => {
        console.log(
          'Cambio Realtime:',
          payload
        )

        onCambio(payload)
      }
    )
    .subscribe(status => {
      console.log(
        'Estado Realtime:',
        status
      )
    })

  return canal
}


export async function cancelarSuscripcion(
  canal
) {
  if (!canal) {
    return
  }

  await supabase.removeChannel(canal)
}