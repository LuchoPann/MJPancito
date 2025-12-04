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

    if (profileError) throw profileError;

    guardarUsuarioActual(perfil);
    return { success: true, usuario: perfil };
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

// Obtener ranking de juego
async function obtenerRankingJuego(juego, limite = 10) {
  try {
    const { data, error } = await supabaseClient
      .from("estadisticas")
      .select("usuario_id, puntos, usuarios(nombre)")
      .eq("juego", juego)
      .order("puntos", { ascending: false })
      .limit(limite);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error obteniendo ranking:", error);
    return [];
  }
}

// Actualizar UI con datos del usuario
function actualizarUIConUsuario(usuario) {
  const nombreInput = document.querySelector('input[placeholder="Tu nombre"]');
  const emailInput = document.querySelector(
    'input[placeholder="tu@email.com"]'
  );

  if (nombreInput) nombreInput.value = usuario.nombre || "";
  if (emailInput) emailInput.value = usuario.email || "";
}
