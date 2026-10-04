import {
  registrarUsuario,
  iniciarSesion,
  cerrarSesion,
  obtenerUsuarioActual,
  obtenerPerfil,
  cambiarContrasena
} from './services/authService.js'

import {
  obtenerTareas,
  crearTarea,
  cambiarEstado,
  eliminarTarea,
  buscarTareaPorId,
  modificarTareaPorId,
  eliminarTareaPorId,
  suscribirseATareas,
  cancelarSuscripcion,
  obtenerPerfiles,
  compartirTarea
} from './services/taskService.js'

import {
  mostrarLoginView,
  configurarLoginView,
  mostrarMensajeLogin
} from './views/loginView.js'

import {
  mostrarTasksView,
  configurarTasksView,
  mostrarTareas,
  mostrarCargandoTareas,
  limpiarFormularioTarea,
  mostrarResultadoRls,
  mostrarMensajePassword,
  mostrarOpcionesCompartir,
  mostrarMensajeCompartir
} from './views/tasksView.js'

import {
  mostrarConfirmacion
} from './components/confirmModal.js'


let usuarioActual = null
let canalRealtime = null


export async function iniciarApp() {
  const {
    user,
    error
  } = await obtenerUsuarioActual()


  if (error) {
    console.error(
      'Error al recuperar sesión:',
      error
    )

    mostrarPantallaLogin()

    return
  }


  if (user) {
    await mostrarPantallaTareas(user)
  } else {
    mostrarPantallaLogin()
  }
}


function mostrarPantallaLogin(
  mensaje = ''
) {
  usuarioActual = null


  mostrarLoginView({
    mensaje
  })


  configurarLoginView({
    onLogin: manejarLogin,
    onRegistro: manejarRegistro
  })
}


async function mostrarPantallaTareas(
  user
) {
  usuarioActual = user


  const { data: perfil } = await obtenerPerfil(user.id)

  mostrarTasksView(user, perfil?.name)


  configurarTasksView({
    onCrear: manejarCrearTarea,
    onLogout: manejarLogout,
    onBuscarPorId:
      manejarBuscarTareaPorId,
    onModificarPorId:
      manejarModificarTareaPorId,
    onEliminarPorId:
      solicitarEliminarTareaPorId,
    onCambiarPassword:
      manejarCambiarPassword,
    onCompartir:
      manejarCompartir
  })


  await cargarTareas()

  await activarRealtime()
}


// ==========================================
// AUTH
// ==========================================

async function manejarLogin({
  email,
  password
}) {
  if (!email || !password) {
    mostrarMensajeLogin(
      'Ingresa correo y contraseña.'
    )

    return
  }


  const {
    data,
    error
  } = await iniciarSesion(
    email,
    password
  )


  if (error) {
    mostrarMensajeLogin(
      'Error: ' + error.message
    )

    return
  }


  if (data.user) {
    await mostrarPantallaTareas(
      data.user
    )
  }
}


async function manejarRegistro({
  email,
  password,
  name
}) {
  if (!email || !password) {
    mostrarMensajeLogin(
      'Ingresa correo y contraseña.'
    )

    return
  }


  const {
    data,
    error
  } = await registrarUsuario(
    email,
    password,
    name
  )


  if (error) {
    mostrarMensajeLogin(
      'Error: ' + error.message
    )

    return
  }


  if (data.session && data.user) {
    await mostrarPantallaTareas(
      data.user
    )

    return
  }


  mostrarMensajeLogin(
    'Usuario registrado. Revisa tu correo si se requiere confirmación.'
  )
}


async function manejarLogout() {
  await detenerRealtime()


  const {
    error
  } = await cerrarSesion()


  if (error) {
    console.error(
      'Error al cerrar sesión:',
      error
    )

    return
  }


  mostrarPantallaLogin(
    'Sesión cerrada correctamente.'
  )
}

async function manejarCambiarPassword(
  nuevaPassword
) {
  if (
    !nuevaPassword ||
    nuevaPassword.length < 6
  ) {
    mostrarMensajePassword(
      'La contraseña debe tener al menos 6 caracteres.',
      'error'
    )

    return
  }


  const { error } =
    await cambiarContrasena(nuevaPassword)


  if (error) {
    mostrarMensajePassword(
      'Error: ' + error.message,
      'error'
    )

    return
  }


  mostrarMensajePassword(
    'Contraseña actualizada correctamente.',
    'success'
  )
}



// ==========================================
// CRUD NORMAL
// ==========================================

async function cargarTareas() {
  mostrarCargandoTareas()


  const {
    data,
    error
  } = await obtenerTareas()


  if (error) {
    console.error(
      'Error al obtener tareas:',
      error
    )

    return
  }


  mostrarTareas({
    tareas: data,
    usuarioId: usuarioActual.id,
    
    onCambiarEstado:
      manejarCambioEstado,

    onEliminar:
      solicitarEliminarTarea
  })
  
  const { data: perfiles } = await obtenerPerfiles()

  mostrarOpcionesCompartir({
    tareas: data.filter(
      tarea => tarea.user_id === usuarioActual.id
    ),
    perfiles: (perfiles || []).filter(
      perfil => perfil.id !== usuarioActual.id
    )
  })
}


async function manejarCrearTarea({
  title,
  description,
  priority
}) {
  if (!usuarioActual) {
    return
  }


  const {
    error
  } = await crearTarea({
    title,
    description,
    priority,
    userId: usuarioActual.id
  })


  if (error) {
    console.error(
      'Error al crear tarea:',
      error
    )

    return
  }


  limpiarFormularioTarea()

  // Realtime actualiza la lista.
}


async function manejarCambioEstado({
  id,
  estadoActual
}) {
  if (!usuarioActual) {
    return
  }


  const {
    error
  } = await cambiarEstado(
    id,
    estadoActual
  )


  if (error) {
    console.error(
      'Error al cambiar estado:',
      error
    )
  }
}


function solicitarEliminarTarea(id) {
  mostrarConfirmacion({
    titulo: 'Eliminar tarea',

    mensaje:
      '¿Seguro que deseas eliminar esta tarea?',

    textoConfirmar:
      'Eliminar',

    onConfirmar:
      async () => {

        const {
          error
        } = await eliminarTarea(id)


        if (error) {
          console.error(
            'Error al eliminar tarea:',
            error
          )
        }
      }
  })
}


// ==========================================
// PRUEBAS EDUCATIVAS DE RLS
// ==========================================

async function manejarBuscarTareaPorId(id) {

  mostrarResultadoRls(
    `Buscando tarea con ID ${id}...`
  )


  const {
    data,
    error
  } = await buscarTareaPorId(id)


  if (error) {

    mostrarResultadoRls(
      'Error: ' + error.message,
      'error'
    )

    return
  }


  if (!data || data.length === 0) {

    mostrarResultadoRls(
      `No se encontró la tarea ${id} o no tienes permiso para verla.`,
      'blocked'
    )

    return
  }


  const tarea = data[0]


  mostrarResultadoRls(
    `Acceso permitido. ID: ${tarea.id} | Título: ${tarea.title} | Prioridad: ${tarea.priority}`,
    'success'
  )
}


async function manejarModificarTareaPorId(
  id,
  nuevoTitulo
) {

  mostrarResultadoRls(
    `Intentando modificar la tarea ${id}...`
  )


  const {
    data,
    error
  } = await modificarTareaPorId(
    id,
    nuevoTitulo
  )


  if (error) {

    mostrarResultadoRls(
      'Error: ' + error.message,
      'error'
    )

    return
  }


  if (!data || data.length === 0) {

    mostrarResultadoRls(
      `La tarea ${id} no existe o RLS impidió modificarla.`,
      'blocked'
    )

    return
  }


  mostrarResultadoRls(
    `Tarea ${id} modificada correctamente.`,
    'success'
  )
}


function solicitarEliminarTareaPorId(id) {

  mostrarConfirmacion({
    titulo:
      'Prueba de eliminación RLS',

    mensaje:
      `Se intentará eliminar directamente la tarea con ID ${id}.`,

    textoConfirmar:
      'Intentar eliminar',

    onConfirmar:
      async () => {

        mostrarResultadoRls(
          `Intentando eliminar la tarea ${id}...`
        )


        const {
          data,
          error
        } = await eliminarTareaPorId(id)


        if (error) {

          mostrarResultadoRls(
            'Error: ' + error.message,
            'error'
          )

          return
        }


        if (
          !data ||
          data.length === 0
        ) {

          mostrarResultadoRls(
            `La tarea ${id} no existe o RLS impidió eliminarla.`,
            'blocked'
          )

          return
        }


        mostrarResultadoRls(
          `Tarea ${id} eliminada correctamente.`,
          'success'
        )
      }
  })
}

// ==========================================
// COMPARTIR TAREAS
// ==========================================

async function manejarCompartir(
  taskId,
  userId
) {
  const { error } =
    await compartirTarea(taskId, userId)


  if (error) {
    mostrarMensajeCompartir(
      'Error: ' + error.message,
      'error'
    )

    return
  }


  mostrarMensajeCompartir(
    'Tarea compartida correctamente.',
    'success'
  )
}

// ==========================================
// REALTIME
// ==========================================

async function activarRealtime() {
  await detenerRealtime()


  canalRealtime =
    suscribirseATareas(
      async () => {
        await cargarTareas()
      }
    )
}


async function detenerRealtime() {
  if (!canalRealtime) {
    return
  }


  await cancelarSuscripcion(
    canalRealtime
  )

  canalRealtime = null
}