// --- RULETA GAME ---

const canvas = document.getElementById("ruleta");
const ctx = canvas.getContext("2d");
const btnGirar = document.getElementById("girarBtn");
const resultado = document.getElementById("resultado");
const modal = document.getElementById("modal");
const tituloModal = document.getElementById("tituloModal");
const mensajeModal = document.getElementById("mensajeModal");
const cerrarModal = document.getElementById("cerrarModal");
const listaOpciones = document.getElementById("listaOpciones");
const btnGuardar = document.getElementById("guardarBtn");
const btnBorrar = document.getElementById("borrarBtn");

cerrarModal.addEventListener("click", () => modal.classList.add("hidden"));
window.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

const tamano = Math.min(window.innerWidth * 0.6, 500);
canvas.width = tamano;
canvas.height = tamano;

const colores = ["#00bcd4", "#8bc34a", "#ffc107", "#e91e63", "#9c27b0"];
let anguloActual = 0;
let girando = false;
let premios = [];

// === Cargar datos del localStorage ===
function cargarDatos() {
  const guardados = localStorage.getItem("opcionesRuleta");
  if (guardados) {
    premios = JSON.parse(guardados);
  } else {
    premios = ["💡 Caso 1", "💡 Caso 2", "💡 Caso 3"];
  }
  listaOpciones.value = premios.join("\n");
  dibujarRuleta();
}

// === Guardar datos ===
function guardarDatos() {
  const texto = listaOpciones.value.trim();
  premios = texto
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => t !== "");
  localStorage.setItem("opcionesRuleta", JSON.stringify(premios));
  dibujarRuleta();
}

// === Borrar todo ===
btnBorrar.addEventListener("click", () => {
  if (confirm("¿Seguro que deseas borrar todas las opciones?")) {
    premios = [];
    listaOpciones.value = "";
    localStorage.removeItem("opcionesRuleta");
    dibujarRuleta();
  }
});

btnGuardar.addEventListener("click", guardarDatos);

function dibujarRuleta() {
  ctx.clearRect(0, 0, tamano, tamano);
  if (premios.length === 0) {
    ctx.fillStyle = "#fff";
    ctx.font = "20px Poppins";
    ctx.textAlign = "center";
    ctx.fillText("Sin opciones", tamano / 2, tamano / 2);
    return;
  }

  const total = premios.length;
  const anguloPorSector = (2 * Math.PI) / total;
  const radio = tamano / 2;

  for (let i = 0; i < total; i++) {
    const inicio = i * anguloPorSector;
    const fin = inicio + anguloPorSector;

    ctx.beginPath();
    ctx.moveTo(radio, radio);
    ctx.arc(radio, radio, radio, inicio, fin);
    ctx.fillStyle = colores[i % colores.length];
    ctx.fill();

    ctx.save();
    ctx.translate(radio, radio);
    ctx.rotate(inicio + anguloPorSector / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.font = `${tamano / 18}px Poppins`;
    ctx.fillText(premios[i], radio - 30, 5);
    ctx.restore();
  }
}

btnGirar.addEventListener("click", () => {
  if (girando || premios.length === 0) return;
  girando = true;
  resultado.textContent = "";

  const vueltas = 5 + Math.random() * 5;
  const destino = anguloActual + vueltas * 2 * Math.PI;
  const duracion = 4000;
  const inicio = performance.now();

  function animarRuleta(tiempo) {
    const progreso = Math.min((tiempo - inicio) / duracion, 1);
    const easeOut = 1 - Math.pow(1 - progreso, 3);
    anguloActual = destino * easeOut;
    ctx.save();
    ctx.translate(tamano / 2, tamano / 2);
    ctx.rotate(anguloActual);
    ctx.translate(-tamano / 2, -tamano / 2);
    dibujarRuleta();
    ctx.restore();

    if (progreso < 1) requestAnimationFrame(animarRuleta);
    else {
      girando = false;
      mostrarResultado();
    }
  }

  requestAnimationFrame(animarRuleta);
});

function mostrarResultado() {
  const total = premios.length;
  const anguloPorSector = (2 * Math.PI) / total;
  const anguloFinal =
    (2 * Math.PI - (anguloActual % (2 * Math.PI))) % (2 * Math.PI);
  const indiceGanador = Math.floor(anguloFinal / anguloPorSector);
  const premio = premios[indiceGanador];
  resultado.textContent = `Resultado: ${premio}`;

  tituloModal.textContent = premio;
  mensajeModal.innerHTML = `Mensaje para <b>${premio}</b>. Puedes personalizar esta parte si lo deseas.`;
  modal.classList.remove("hidden");
}

// Cargar al inicio
cargarDatos();

// --- THEME TOGGLE ---
const themeSwitch = document.getElementById("theme-switch");

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("app-theme");
  const prefersDark = saved
    ? saved === "dark"
    : window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light");
  if (themeSwitch) themeSwitch.checked = prefersDark;
});

if (themeSwitch) {
  themeSwitch.addEventListener("change", (e) => {
    const newTheme = e.target.checked ? "dark" : "light";
    applyTheme(newTheme);
    try {
      localStorage.setItem("app-theme", newTheme);
    } catch (err) {
      // Silenciar si localStorage no está disponible
    }
  });
}
