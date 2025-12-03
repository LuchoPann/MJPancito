// --- POOL DE PALABRAS ---
const gridSize = 15;
const wordsPerGame = 10;
const wordsFilePath = "../src/words.json";

let wordsToFind = [];
let foundWordsCount = 0;

// --- ELEMENTOS DEL DOM ---
const gridElement = document.getElementById("word-search-grid");
const wordListElement = document.getElementById("word-list");
const modalElement = document.getElementById("completion-modal");
const newGameBtn = document.getElementById("new-game-btn");

document.documentElement.style.setProperty("--grid-size", gridSize);

let grid = [];
let isSelecting = false;
let selectedCells = [];

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
  initializeGame().catch(console.error);
});
newGameBtn.addEventListener("click", () => {
  initializeGame().catch(console.error);
});

/**
 * Carga las palabras, las selecciona, las coloca y reinicia el juego.
 */
async function initializeGame() {
  modalElement.classList.remove("visible");
  foundWordsCount = 0;
  wordsToFind = [];

  let wordPool = [];
  try {
    const response = await fetch(wordsFilePath);
    if (!response.ok) {
      throw new Error(`Error al cargar las palabras: ${response.statusText}`);
    }
    wordPool = await response.json();
  } catch (error) {
    console.error("No se pudo inicializar el juego:", error);
    gridElement.innerHTML = `<p style="color: red; padding: 20px;">Error al cargar las palabras. Asegúrate de que el archivo '${wordsFilePath}' exista en la misma carpeta.</p>`;
    wordListElement.innerHTML = "";
    return;
  }

  wordsToFind = selectRandomWords(wordPool, wordsPerGame);

  createGrid();
  placeWords();
  fillEmptyCells();
  renderGrid();
  renderWordList();
  addEventListeners();
}

/**
 * Selecciona un número `count` de palabras aleatorias de un `pool`.
 */
function selectRandomWords(pool, count) {
  const shuffled = pool.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function createGrid() {
  grid = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(""));
}

function placeWords() {
  if (!wordsToFind || wordsToFind.length === 0) {
    console.warn("No hay palabras para colocar.");
    return;
  }
  for (const word of wordsToFind) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      const direction = Math.floor(Math.random() * 4);
      const row = Math.floor(Math.random() * gridSize);
      const col = Math.floor(Math.random() * gridSize);
      if (canPlaceWord(word, row, col, direction)) {
        placeWord(word, row, col, direction);
        placed = true;
      }
      attempts++;
    }
  }
}

function canPlaceWord(word, row, col, direction) {
  for (let i = 0; i < word.length; i++) {
    let r = row,
      c = col;
    if (direction === 0) c += i;
    else if (direction === 1) r += i;
    else if (direction === 2) c -= i;
    else if (direction === 3) r -= i;
    if (
      r < 0 ||
      r >= gridSize ||
      c < 0 ||
      c >= gridSize ||
      (grid[r][c] !== "" && grid[r][c] !== word[i])
    ) {
      return false;
    }
  }
  return true;
}

function placeWord(word, row, col, direction) {
  for (let i = 0; i < word.length; i++) {
    let r = row,
      c = col;
    if (direction === 0) c += i;
    else if (direction === 1) r += i;
    else if (direction === 2) c -= i;
    else if (direction === 3) r -= i;
    grid[r][c] = word[i].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
}

function fillEmptyCells() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }
}

function renderGrid() {
  gridElement.innerHTML = "";
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.textContent = grid[r][c];
      cell.dataset.row = r;
      cell.dataset.col = c;
      gridElement.appendChild(cell);
    }
  }
}

function renderWordList() {
  wordListElement.innerHTML = "";
  const ul = document.createElement("ul");
  wordsToFind.forEach((word) => {
    const li = document.createElement("li");
    li.textContent = word;
    li.id = `word-${word}`;
    ul.appendChild(li);
  });
  wordListElement.appendChild(ul);
}

function addEventListeners() {
  gridElement.removeEventListener("mousedown", startSelection);
  gridElement.removeEventListener("mouseover", continueSelection);
  document.removeEventListener("mouseup", endSelection);
  gridElement.removeEventListener("touchstart", handleTouchStart);
  gridElement.removeEventListener("touchmove", handleTouchMove);
  document.removeEventListener("touchend", endSelection);

  gridElement.addEventListener("mousedown", startSelection);
  gridElement.addEventListener("mouseover", continueSelection);
  document.addEventListener("mouseup", endSelection);
  gridElement.addEventListener("touchstart", handleTouchStart, {
    passive: false,
  });
  gridElement.addEventListener("touchmove", handleTouchMove, {
    passive: false,
  });
  document.addEventListener("touchend", endSelection);
}

function handleTouchStart(e) {
  e.preventDefault();
  startSelection(e.touches[0]);
}

function handleTouchMove(e) {
  e.preventDefault();
  continueSelection(e.touches[0]);
}

function startSelection(e) {
  const target = getCellFromEvent(e);
  if (target) {
    isSelecting = true;
    selectedCells = [target];
    target.classList.add("selected");
  }
}

function continueSelection(e) {
  const target = getCellFromEvent(e);
  if (isSelecting && target && !selectedCells.includes(target)) {
    selectedCells.push(target);
    target.classList.add("selected");
  }
}

function getCellFromEvent(e) {
  const targetElement = document.elementFromPoint(e.clientX, e.clientY);
  return targetElement && targetElement.classList.contains("cell")
    ? targetElement
    : null;
}

function endSelection() {
  if (isSelecting) {
    isSelecting = false;
    checkSelection();
  }
}

function checkSelection() {
  if (selectedCells.length === 0) return;
  let selectedWord = selectedCells.map((cell) => cell.textContent).join("");
  let selectedWordReversed = [...selectedWord].reverse().join("");
  let found = false;

  if (wordsToFind.includes(selectedWord)) {
    markAsFound(selectedWord);
    found = true;
  } else if (wordsToFind.includes(selectedWordReversed)) {
    markAsFound(selectedWordReversed);
    found = true;
  }

  if (found) {
    selectedCells.forEach((cell) => {
      cell.classList.remove("selected");
      cell.classList.add("found");
    });
  } else {
    selectedCells.forEach((cell) => cell.classList.remove("selected"));
  }
  selectedCells = [];
}

function markAsFound(word) {
  const wordLi = document.getElementById(`word-${word}`);
  if (wordLi && !wordLi.classList.contains("found-word")) {
    wordLi.classList.add("found-word");
    foundWordsCount++;
    if (foundWordsCount === wordsToFind.length) {
      modalElement.classList.add("visible");
    }
  }
}

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
