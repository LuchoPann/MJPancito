// Configuración de Supabase
const SUPABASE_URL = "https://jnuvaouilclletltupuu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpudXZhb3VpbGNsbGV0bHR1cHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzk5MTcsImV4cCI6MjA3NjkxNTkxN30.0vSpaVBSKCpd5kJLUlzlZBFXtjpxvji-CdvHTZPWJpU";

// Inicializar cliente de Supabase
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Almacenar ID del usuario actual
let usuarioActual = null;

// Obtener usuario actual del localStorage
function obtenerUsuarioActual() {
  const usuario = localStorage.getItem("usuarioActual");
  return usuario ? JSON.parse(usuario) : null;
}

// Guardar usuario actual en localStorage
function guardarUsuarioActual(usuario) {
  localStorage.setItem("usuarioActual", JSON.stringify(usuario));
  usuarioActual = usuario;
}

// Registrar nuevo usuario con contraseña
async function registrarUsuario(email, contraseña, nombre) {
  try {
    // Registrarse con Supabase Auth
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.signUp({
      email: email,
      password: contraseña,
      options: {
        data: {
          nombre: nombre,
        },
      },
    });

    if (authError) throw authError;

    console.log("Usuario auth creado:", user.id);

    // Crear perfil del usuario en tabla usuarios
    const { data: perfil, error: profileError } = await supabaseClient
      .from("usuarios")
      .insert([
        {
          id: user.id,
          email: email,
          nombre: nombre,
          fecha_creacion: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (profileError) {
      console.error("Error RLS detallado:", profileError);
      throw profileError;
    }

    console.log("Perfil creado:", perfil);

    // Intentar hacer login automático después del registro
    const {
      data: { user: loginUser },
      error: loginError,
    } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: contraseña,
    });

    if (!loginError && loginUser) {
      guardarUsuarioActual(perfil);
      return { success: true, usuario: perfil };
    } else {
      // Si login automático falla, devolver el usuario del registro
      guardarUsuarioActual(perfil);
      return { success: true, usuario: perfil };
    }
  } catch (error) {
    console.error("Error registrando usuario:", error);
    return { success: false, error: error.message };
  }
}

// Iniciar sesión con contraseña
async function iniciarSesion(email, contraseña) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: contraseña,
    });

    if (authError) throw authError;

    // Obtener datos del perfil
    const { data: perfil, error: profileError } = await supabaseClient
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    guardarUsuarioActual(perfil);
    return { success: true, usuario: perfil };
  } catch (error) {
    console.error("Error iniciando sesión:", error);
    return { success: false, error: error.message };
  }
}

// Cerrar sesión
async function cerrarSesion() {
  try {
    await supabaseClient.auth.signOut();
    localStorage.removeItem("usuarioActual");
    usuarioActual = null;
    return true;
  } catch (error) {
    console.error("Error cerrando sesión:", error);
    return false;
  }
}

// Buscar usuario por email
async function buscarUsuarioPorEmail(email) {
  try {
    const { data, error } = await supabaseClient
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error buscando usuario:", error);
    return null;
  }
}

// Actualizar perfil del usuario
async function actualizarPerfil(usuarioId, datos) {
  try {
    const { data, error } = await supabaseClient
      .from("usuarios")
      .update(datos)
      .eq("id", usuarioId)
      .select()
      .single();

    if (error) throw error;
    guardarUsuarioActual(data);
    return data;
  } catch (error) {
    console.error("Error actualizando perfil:", error);
    return null;
  }
}

// Guardar estadísticas de juego
async function guardarEstadistica(usuarioId, juego, puntos, tiempo) {
  try {
    const { data, error } = await supabaseClient
      .from("estadisticas")
      .insert([
        {
          usuario_id: usuarioId,
          juego: juego,
          puntos: puntos,
          tiempo: tiempo,
          fecha: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Verificar logros después de guardar
    await verificarLogros(usuarioId);

    return data;
  } catch (error) {
    console.error("Error guardando estadística:", error);
    return null;
  }
}

// Obtener estadísticas del usuario
async function obtenerEstadisticas(usuarioId, juego = null) {
  try {
    let query = supabaseClient
      .from("estadisticas")
      .select("*")
      .eq("usuario_id", usuarioId);

    if (juego) {
      query = query.eq("juego", juego);
    }

    const { data, error } = await query.order("fecha", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return [];
  }
}

// Obtener ranking de juego (Versión corregida: Join Manual)
async function obtenerRankingJuego(juego, limite = 10) {
  try {
    // 1. Obtener estadísticas crudas
    const { data: stats, error: statError } = await supabaseClient
      .from("estadisticas")
      .select("usuario_id, puntos")
      .eq("juego", juego) // Asegúrate que 'juego' esté en minúsculas al guardar
      .order("puntos", { ascending: false });

    if (statError) throw statError;

    // 2. Agrupar puntos por usuario
    const rankingMap = {};
    stats.forEach((record) => {
      if (!rankingMap[record.usuario_id]) {
        rankingMap[record.usuario_id] = {
          usuario_id: record.usuario_id,
          nombre: "Cargando...", // Nombre temporal
          puntos: 0,
          partidas: 0,
        };
      }
      rankingMap[record.usuario_id].puntos += record.puntos;
      rankingMap[record.usuario_id].partidas += 1;
    });

    // 3. Obtener los nombres reales de los usuarios encontrados
    const usuariosIds = Object.keys(rankingMap);
    if (usuariosIds.length > 0) {
      const { data: usuarios, error: userError } = await supabaseClient
        .from("usuarios")
        .select("id, nombre")
        .in("id", usuariosIds);

      if (!userError && usuarios) {
        // Asignar nombres al mapa
        usuarios.forEach((user) => {
          if (rankingMap[user.id]) {
            rankingMap[user.id].nombre = user.nombre;
          }
        });
      }
    }

    // 4. Convertir a array, ordenar y recortar
    return Object.values(rankingMap)
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, limite);
  } catch (error) {
    console.error("Error obteniendo ranking juego:", error);
    return [];
  }
}

// Obtener ranking global (Versión corregida: Join Manual)
async function obtenerRankingGlobal(limite = 20) {
  try {
    // 1. Obtener TODAS las estadísticas
    const { data: stats, error: statError } = await supabaseClient
      .from("estadisticas")
      .select("usuario_id, puntos, juego")
      .order("puntos", { ascending: false });

    if (statError) throw statError;

    // 2. Agrupar y filtrar (excluyendo ruleta en JS para ser seguros)
    const rankingMap = {};

    stats.forEach((record) => {
      // Normalizar nombre del juego a minúsculas para comparar
      const nombreJuego = (record.juego || "").toLowerCase();

      // Si es ruleta, lo saltamos
      if (nombreJuego === "ruleta") return;

      if (!rankingMap[record.usuario_id]) {
        rankingMap[record.usuario_id] = {
          usuario_id: record.usuario_id,
          nombre: "Usuario",
          puntos_totales: 0,
          juegos_jugados: 0,
        };
      }
      rankingMap[record.usuario_id].puntos_totales += record.puntos;
      rankingMap[record.usuario_id].juegos_jugados += 1;
    });

    // 3. Obtener nombres de usuarios
    const usuariosIds = Object.keys(rankingMap);
    if (usuariosIds.length > 0) {
      const { data: usuarios, error: userError } = await supabaseClient
        .from("usuarios")
        .select("id, nombre")
        .in("id", usuariosIds);

      if (!userError && usuarios) {
        usuarios.forEach((user) => {
          if (rankingMap[user.id]) {
            rankingMap[user.id].nombre = user.nombre;
          }
        });
      }
    }

    // 4. Ordenar y devolver
    return Object.values(rankingMap)
      .sort((a, b) => b.puntos_totales - a.puntos_totales)
      .slice(0, limite);
  } catch (error) {
    console.error("Error obteniendo ranking global:", error);
    return [];
  }
}

// Obtener estadísticas resume del usuario
async function obtenerResumenEstadisticas(usuarioId) {
  try {
    const { data, error } = await supabaseClient
      .from("estadisticas")
      .select("*")
      .eq("usuario_id", usuarioId);

    if (error) throw error;

    const resumen = {
      total_partidas: data.length,
      puntos_totales: 0,
      promedio_puntos: 0,
      mejor_puntaje: 0,
      juegos: {},
    };

    data.forEach((stat) => {
      resumen.puntos_totales += stat.puntos;
      if (stat.puntos > resumen.mejor_puntaje) {
        resumen.mejor_puntaje = stat.puntos;
      }

      if (!resumen.juegos[stat.juego]) {
        resumen.juegos[stat.juego] = {
          nombre: stat.juego,
          partidas: 0,
          puntos: 0,
          mejor: 0,
        };
      }
      resumen.juegos[stat.juego].partidas += 1;
      resumen.juegos[stat.juego].puntos += stat.puntos;
      if (stat.puntos > resumen.juegos[stat.juego].mejor) {
        resumen.juegos[stat.juego].mejor = stat.puntos;
      }
    });

    resumen.promedio_puntos =
      resumen.total_partidas > 0
        ? Math.round(resumen.puntos_totales / resumen.total_partidas)
        : 0;

    return resumen;
  } catch (error) {
    console.error("Error obteniendo resumen estadísticas:", error);
    return null;
  }
}

// Sistema de Logros
async function obtenerLogros(usuarioId) {
  try {
    const { data, error } = await supabaseClient
      .from("logros")
      .select("*")
      .eq("usuario_id", usuarioId)
      .order("fecha_obtenido", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error obteniendo logros:", error);
    return [];
  }
}

// Desbloquear logro
async function desbloquearLogro(usuarioId, logroId) {
  try {
    const { data, error } = await supabaseClient
      .from("logros")
      .insert([
        {
          usuario_id: usuarioId,
          logro_id: logroId,
          fecha_obtenido: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error && error.code !== "23505") throw error; // 23505 es el error de duplicate key
    return data;
  } catch (error) {
    console.error("Error desbloqueando logro:", error);
    return null;
  }
}

// Definir los logros disponibles
const LOGROS_DISPONIBLES = {
  PRIMER_JUEGO: {
    id: "primer_juego",
    nombre: "🎮 Primer Juego",
    descripcion: "Completa tu primer juego",
    icono: "🎮",
  },
  CENTENA: {
    id: "100_puntos",
    nombre: "⭐ Centena",
    descripcion: "Obtén 100 puntos en un juego",
    icono: "⭐",
  },
  QUINTO_CENTENAR: {
    id: "500_puntos",
    nombre: "🌟 Quinto Centenar",
    descripcion: "Obtén 500 puntos totales",
    icono: "🌟",
  },
  DECADA: {
    id: "10_partidas",
    nombre: "🏆 Década",
    descripcion: "Completa 10 partidas",
    icono: "🏆",
  },
  MAESTRO: {
    id: "todos_juegos",
    nombre: "👑 Maestro",
    descripcion: "Juega todos los juegos disponibles",
    icono: "👑",
  },
};

// Verificar y desbloquear logros automáticamente
async function verificarLogros(usuarioId) {
  try {
    const resumen = await obtenerResumenEstadisticas(usuarioId);
    const logrosObtenidos = await obtenerLogros(usuarioId);
    const logrosObtenidosIds = logrosObtenidos.map((l) => l.logro_id);

    // Logro: Primer Juego
    if (
      resumen.total_partidas >= 1 &&
      !logrosObtenidosIds.includes("primer_juego")
    ) {
      await desbloquearLogro(usuarioId, "primer_juego");
    }

    // Logro: 100 Puntos
    if (
      resumen.mejor_puntaje >= 100 &&
      !logrosObtenidosIds.includes("100_puntos")
    ) {
      await desbloquearLogro(usuarioId, "100_puntos");
    }

    // Logro: 500 Puntos Totales
    if (
      resumen.puntos_totales >= 500 &&
      !logrosObtenidosIds.includes("500_puntos")
    ) {
      await desbloquearLogro(usuarioId, "500_puntos");
    }

    // Logro: 10 Partidas
    if (
      resumen.total_partidas >= 10 &&
      !logrosObtenidosIds.includes("10_partidas")
    ) {
      await desbloquearLogro(usuarioId, "10_partidas");
    }

    // Logro: Todos los Juegos (solo Crucigrama y Sopita, no Ruleta)
    const juegosUnicos = Object.keys(resumen.juegos).filter(
      (juego) => juego !== "ruleta"
    ).length;
    const juegosDisponibles = 2; // Crucigrama y Sopita
    if (
      juegosUnicos >= juegosDisponibles &&
      !logrosObtenidosIds.includes("todos_juegos")
    ) {
      await desbloquearLogro(usuarioId, "todos_juegos");
    }

    return { success: true };
  } catch (error) {
    console.error("Error verificando logros:", error);
    return { success: false, error: error.message };
  }
}

// Calcular edad desde fecha de nacimiento
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

// Convertir fecha a formato legible
function formatearFecha(fecha) {
  if (!fecha) return "-";
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(fecha).toLocaleDateString("es-ES", options);
}

// Obtener nombre de sexo
function obtenerSexoTexto(sexo) {
  const sexos = {
    masculino: "Masculino",
    femenino: "Femenino",
    otro: "Otro",
    preferir_no_decir: "Prefiero no decir",
  };
  return sexos[sexo] || "-";
}

// Actualizar UI con datos del usuario
function actualizarUIConUsuario(usuario) {
  // Actualizar vista de perfil (lectura)
  if (usuario.nombre) {
    document.getElementById("nombrePerfil").textContent = usuario.nombre;
    document.getElementById("displayNombre").textContent = usuario.nombre;
  }

  document.getElementById("emailPerfil").textContent = usuario.email;
  document.getElementById("displayEmail").textContent = usuario.email;

  if (usuario.fecha_nacimiento) {
    const edad = calcularEdad(usuario.fecha_nacimiento);
    document.getElementById("displayEdad").textContent = edad
      ? `${edad} años`
      : "-";
    document.getElementById("displayFechaNacimiento").textContent =
      formatearFecha(usuario.fecha_nacimiento);
  }

  document.getElementById("displaySexo").textContent = obtenerSexoTexto(
    usuario.sexo || ""
  );

  // Mostrar foto de perfil si existe
  if (usuario.foto_url) {
    document.getElementById("fotoPerfil").src = usuario.foto_url;
    document.getElementById("previewFoto").src = usuario.foto_url;
  }

  // Actualizar formulario de edición
  document.getElementById("editNombre").value = usuario.nombre || "";
  document.getElementById("editFechaNacimiento").value =
    usuario.fecha_nacimiento || "";
  document.getElementById("editSexo").value = usuario.sexo || "";

  // Actualizar edad automática cuando cambia la fecha
  if (usuario.fecha_nacimiento) {
    const edad = calcularEdad(usuario.fecha_nacimiento);
    document.getElementById(
      "edadAutomatica"
    ).textContent = `Edad: ${edad} años`;
  }
}
