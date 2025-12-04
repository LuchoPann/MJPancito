// --- CRUCIGRAMA GAME ---

// Constantes para el sistema de puntos
const TIEMPO_BONUS_CRUCIGRAMA = 30; // 30 segundos para bonus
const PUNTOS_BONUS_CRUCIGRAMA = 15; // 15 puntos en los primeros 30 seg
const PUNTOS_NORMAL_CRUCIGRAMA = 10; // 10 puntos normales

let inicioJuegoCrucigrama = null;
let puntosObtenidosCrucigrama = 0;
let juegoCompletadoCrucigrama = false;
let timerIntervalCrucigrama = null; // Para controlar el interval del timer

async function loadWords() {
  const res = await fetch("../src/words.json");
  if (!res.ok) throw new Error("No se pudo cargar words.json");
  const data = await res.json();
  return data.map((w) => String(w).trim().toUpperCase()).filter(Boolean);
}

function startTimerCrucigrama() {
  const timerElement = document.getElementById("timer");
  if (!timerElement) return;

  timerElement.textContent = "00:00";

  timerIntervalCrucigrama = setInterval(() => {
    if (inicioJuegoCrucigrama) {
      const tiempoTranscurrido = Math.floor(
        (Date.now() - inicioJuegoCrucigrama) / 1000
      );
      const minutos = Math.floor(tiempoTranscurrido / 60);
      const segundos = tiempoTranscurrido % 60;
      timerElement.textContent = `${String(minutos).padStart(2, "0")}:${String(
        segundos
      ).padStart(2, "0")}`;
    }
  }, 1000);
}

async function initCrossword() {
  let wordPool = [];
  try {
    wordPool = await loadWords();
  } catch (err) {
    document.getElementById("crossword").innerHTML =
      '<div class="error-msg">Error cargando palabras. Asegura <code>src/words.json</code> y su formato.</div>';
    console.error(err);
    return;
  }

  // Reinicializar variables
  inicioJuegoCrucigrama = Date.now();
  puntosObtenidosCrucigrama = 0;
  juegoCompletadoCrucigrama = false;

  // Limpiar timer anterior y iniciar uno nuevo
  if (timerIntervalCrucigrama) clearInterval(timerIntervalCrucigrama);
  startTimerCrucigrama();

  const words = [...wordPool].sort(() => 0.5 - Math.random()).slice(0, 10);
  const crossword = document.getElementById("crossword");
  crossword.innerHTML = "";

  const list = document.getElementById("word-list");
  list.innerHTML = "";
  words.forEach((w, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${w}`;
    li.id = `word-${w}`;
    list.appendChild(li);
  });

  const size = 20;
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const placedWords = [];

  function canPlace(word, x, y, dir) {
    const dx = dir === "H" ? 1 : 0;
    const dy = dir === "V" ? 1 : 0;

    if (x < 1 || y < 1) return false;
    if (dir === "H" && x + word.length > size - 2) return false;
    if (dir === "V" && y + word.length > size - 2) return false;

    for (let i = 0; i < word.length; i++) {
      const cx = x + dx * i,
        cy = y + dy * i;
      const current = grid[cy][cx];
      if (current && current !== word[i]) return false;
      if (i === 0) {
        const px = cx - dx,
          py = cy - dy;
        if (grid[py] && grid[py][px]) return false;
      }
      if (i === word.length - 1) {
        const nx = cx + dx,
          ny = cy + dy;
        if (grid[ny] && grid[ny][nx]) return false;
      }
    }
    return true;
  }

  function placeWord(word) {
    if (placedWords.length === 0) {
      const cx = Math.floor(size / 2) - Math.floor(word.length / 2);
      const cy = Math.floor(size / 2);
      for (let i = 0; i < word.length; i++) grid[cy][cx + i] = word[i];
      placedWords.push({ word, x: cx, y: cy, dir: "H" });
      return true;
    }

    const existing = placedWords.flatMap((p) =>
      p.word.split("").map((ch, i) => ({
        ch,
        x: p.dir === "H" ? p.x + i : p.x,
        y: p.dir === "H" ? p.y : p.y + i,
      }))
    );

    for (let tries = 0; tries < 300; tries++) {
      const letter = word[Math.floor(Math.random() * word.length)];
      const matches = existing.filter((e) => e.ch === letter);
      if (!matches.length) continue;
      const match = matches[Math.floor(Math.random() * matches.length)];
      const dir = Math.random() < 0.5 ? "H" : "V";
      const baseX = dir === "H" ? match.x - word.indexOf(letter) : match.x;
      const baseY = dir === "V" ? match.y - word.indexOf(letter) : match.y;
      if (canPlace(word, baseX, baseY, dir)) {
        for (let i = 0; i < word.length; i++) {
          const cx = baseX + (dir === "H" ? i : 0);
          const cy = baseY + (dir === "V" ? i : 0);
          grid[cy][cx] = word[i];
        }
        placedWords.push({ word, x: baseX, y: baseY, dir });
        return true;
      }
    }
    return false;
  }

  for (const w of words) {
    placeWord(w);
  }

  if (placedWords.length === 0) {
    crossword.innerHTML =
      '<div class="error-msg">No se pudieron colocar palabras. Prueba con otras palabras más cortas.</div>';
    return;
  }

  const allX = placedWords.flatMap((p) =>
    p.dir === "H"
      ? Array.from({ length: p.word.length }, (_, i) => p.x + i)
      : [p.x]
  );
  const allY = placedWords.flatMap((p) =>
    p.dir === "V"
      ? Array.from({ length: p.word.length }, (_, i) => p.y + i)
      : [p.y]
  );
  const minX = Math.min(...allX),
    maxX = Math.max(...allX);
  const minY = Math.min(...allY),
    maxY = Math.max(...allY);

  crossword.style.gridTemplateColumns = `repeat(${
    maxX - minX + 1
  }, var(--cell-size))`;

  const cells = {};
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const ch = grid[y][x];
      if (ch) {
        const input = document.createElement("input");
        input.className = "cell";
        input.maxLength = 1;
        input.dataset.correct = ch;
        input.dataset.x = x;
        input.dataset.y = y;
        crossword.appendChild(input);
        cells[`${x},${y}`] = input;
      } else {
        const div = document.createElement("div");
        div.className = "block";
        crossword.appendChild(div);
      }
    }
  }

  placedWords.forEach((p, i) => {
    const startCell = cells[`${p.x},${p.y}`];
    if (startCell) {
      startCell.placeholder = String(i + 1);
    }
  });

  Object.values(cells).forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.toUpperCase().slice(0, 1);
      if (input.value === "") {
        input.classList.remove("correct", "incorrect");
      } else if (input.value === input.dataset.correct) {
        input.classList.add("correct");
        input.classList.remove("incorrect");
      } else {
        input.classList.add("incorrect");
        input.classList.remove("correct");
      }
      checkWords();
    });
  });

  function checkWords() {
    let completed = 0;
    placedWords.forEach((p) => {
      const { word, x, y, dir } = p;
      const inputs = [];
      for (let i = 0; i < word.length; i++) {
        const cx = x + (dir === "H" ? i : 0);
        const cy = y + (dir === "V" ? i : 0);
        const el = cells[`${cx},${cy}`];
        if (el) inputs.push(el);
      }
      const correct =
        inputs.length > 0 &&
        inputs.every((e) => e.value.toUpperCase() === e.dataset.correct);
      if (correct) {
        inputs.forEach((e) => {
          e.readOnly = true;
          e.classList.add("correct");
        });
        const li = document.getElementById(`word-${word}`);
        if (li && !li.classList.contains("found-word")) {
          li.classList.add("found-word");

          // Calcular y agregar puntos
          const tiempoTranscurrido =
            (Date.now() - inicioJuegoCrucigrama) / 1000;
          if (tiempoTranscurrido <= TIEMPO_BONUS_CRUCIGRAMA) {
            puntosObtenidosCrucigrama += PUNTOS_BONUS_CRUCIGRAMA;
            console.log(
              `⚡ Palabra encontrada rápido! +${PUNTOS_BONUS_CRUCIGRAMA} pts (tiempo: ${tiempoTranscurrido.toFixed(
                1
              )}s)`
            );
          } else {
            puntosObtenidosCrucigrama += PUNTOS_NORMAL_CRUCIGRAMA;
            console.log(
              `✓ Palabra encontrada. +${PUNTOS_NORMAL_CRUCIGRAMA} pts`
            );
          }
        }
        completed++;
      }
    });

    if (completed === placedWords.length) {
      juegoCompletadoCrucigrama = true;
      console.log(
        `🎉 ¡Crucigrama completado! Puntos totales: ${puntosObtenidosCrucigrama}`
      );
      document.getElementById("completion-modal").classList.add("visible");
      // Guardar estadística cuando se completa el crucigrama
      guardarEstadisticaCrucigrama();
    } else {
      document.getElementById("completion-modal").classList.remove("visible");
    }
  }

  document.getElementById("new-game-btn").onclick = async () => {
    document.getElementById("completion-modal").classList.remove("visible");
    await initCrossword();
  };
}

// Función para guardar estadística del crucigrama
async function guardarEstadisticaCrucigrama() {
  // Obtener usuario actual desde localStorage
  const usuarioJSON = localStorage.getItem("usuarioActual");
  if (!usuarioJSON) {
    console.log("Usuario no logueado, estadística no guardada");
    return;
  }

  const usuario = JSON.parse(usuarioJSON);
  const tiempoSegundos = Math.floor(
    (Date.now() - inicioJuegoCrucigrama) / 1000
  );

  // Guardar en Supabase (si la función existe)
  if (typeof guardarEstadistica === "function") {
    const resultado = await guardarEstadistica(
      usuario.id,
      "crucigrama",
      puntosObtenidosCrucigrama,
      tiempoSegundos
    );

    if (resultado) {
      console.log("✅ Estadística guardada:", resultado);
    } else {
      console.log("❌ Error guardando estadística");
    }
  } else {
    console.log("⚠️ Función guardarEstadistica no disponible");
  }
}

document.addEventListener("DOMContentLoaded", initCrossword);

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
