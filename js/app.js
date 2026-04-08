// ---- State ----
let gameState = null;

// ---- DOM refs ----
const board = document.getElementById("board");
const keyboard = document.getElementById("keyboard");
const toastContainer = document.getElementById("toast-container");
const dayBadge = document.getElementById("day-badge");
const confettiCanvas = document.getElementById("confetti-canvas");

// ---- Keyboard layout ----
const KEY_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["Enter","Z","X","C","V","B","N","M","⌫"]
];

// ---- Init ----
function init() {
  gameState = loadSavedGame() || createGameState();
  dayBadge.textContent = `#${gameState.dayNumber}`;

  buildBoard();
  buildKeyboard();
  restoreBoard();

  if (gameState.status !== "playing") {
    setTimeout(() => showEndState(), 400);
  }

  attachListeners();
}

// ---- Board ----
function buildBoard() {
  board.innerHTML = "";
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = document.createElement("div");
    row.className = "tile-row";
    row.id = `tile-row-${r}`;
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.id = `tile-${r}-${c}`;
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

function restoreBoard() {
  for (let r = 0; r < gameState.boardState.length; r++) {
    const rowData = gameState.boardState[r];
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = getTile(r, c);
      tile.textContent = rowData[c].letter;
      tile.dataset.letter = rowData[c].letter;
      tile.classList.add(rowData[c].state);
    }
  }

  if (gameState.status === "playing") {
    gameState.currentInput.forEach((letter, c) => {
      const tile = getTile(gameState.currentRow, c);
      tile.textContent = letter;
      tile.dataset.letter = letter;
    });
  }

  restoreKeyboard();
}

function getTile(row, col) {
  return document.getElementById(`tile-${row}-${col}`);
}

function getRow(rowIndex) {
  return document.getElementById(`tile-row-${rowIndex}`);
}

// ---- Keyboard ----
function buildKeyboard() {
  keyboard.innerHTML = "";
  KEY_ROWS.forEach(keys => {
    const rowEl = document.createElement("div");
    rowEl.className = "key-row";
    keys.forEach(key => {
      const btn = document.createElement("button");
      btn.className = "key";
      btn.textContent = key;
      btn.dataset.key = key;
      if (key === "Enter" || key === "⌫") btn.classList.add("wide");
      btn.addEventListener("click", () => handleKey(key));
      rowEl.appendChild(btn);
    });
    keyboard.appendChild(rowEl);
  });
}

function updateKeyboard(evaluation) {
  const priority = { correct: 3, present: 2, absent: 1 };
  evaluation.forEach(({ letter, state }) => {
    const btn = keyboard.querySelector(`[data-key="${letter}"]`);
    if (!btn) return;
    const current = btn.dataset.statePriority ? parseInt(btn.dataset.statePriority) : 0;
    if (priority[state] > current) {
      btn.classList.remove("correct", "present", "absent");
      btn.classList.add(state);
      btn.dataset.statePriority = priority[state];
    }
  });
}

function restoreKeyboard() {
  for (const row of gameState.boardState) {
    updateKeyboard(row);
  }
}

// ---- Input handling ----
function handleKey(key) {
  if (gameState.status !== "playing") return;

  if (key === "Enter") {
    submitGuess();
  } else if (key === "⌫" || key === "Backspace") {
    deleteLetter();
  } else if (/^[A-Za-z]$/.test(key)) {
    typeLetter(key.toUpperCase());
  }
}

function typeLetter(letter) {
  if (gameState.currentInput.length >= WORD_LENGTH) return;
  gameState.currentInput.push(letter);
  const col = gameState.currentInput.length - 1;
  const tile = getTile(gameState.currentRow, col);
  tile.textContent = letter;
  tile.dataset.letter = letter;
  tile.classList.remove("pop");
  void tile.offsetWidth;
  tile.classList.add("pop");
  saveGame(gameState);
}

function deleteLetter() {
  if (gameState.currentInput.length === 0) return;
  const col = gameState.currentInput.length - 1;
  const tile = getTile(gameState.currentRow, col);
  tile.textContent = "";
  delete tile.dataset.letter;
  gameState.currentInput.pop();
  saveGame(gameState);
}

function submitGuess() {
  if (gameState.currentInput.length < WORD_LENGTH) {
    showToast("Not enough letters");
    shakeRow(gameState.currentRow);
    return;
  }

  const guess = gameState.currentInput.join("");

  if (!isValidWord(guess)) {
    showToast("Not in word list");
    shakeRow(gameState.currentRow);
    return;
  }

  const evaluation = evaluateGuess(guess, gameState.answer);
  gameState.guesses.push(guess);
  gameState.boardState.push(evaluation);

  revealRow(gameState.currentRow, evaluation, () => {
    updateKeyboard(evaluation);

    const won = evaluation.every(t => t.state === "correct");

    if (won) {
      gameState.status = "won";
      saveGame(gameState);
      updateStats(true, gameState.currentRow + 1, gameState.dayNumber);
      setTimeout(() => {
        celebrateWin(gameState.currentRow);
        showToast(winMessage(gameState.currentRow + 1), 3000);
        setTimeout(() => showEndState(), 2200);
      }, 300);
    } else if (gameState.currentRow >= MAX_GUESSES - 1) {
      gameState.status = "lost";
      saveGame(gameState);
      updateStats(false, 0, gameState.dayNumber);
      setTimeout(() => {
        showToast(gameState.answer, 4000);
        setTimeout(() => showEndState(), 2800);
      }, 400);
    } else {
      gameState.currentRow++;
      gameState.currentInput = [];
      saveGame(gameState);
    }
  });
}

function winMessage(guesses) {
  const msgs = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"];
  return msgs[Math.min(guesses - 1, 5)];
}

// ---- Animations ----
function revealRow(rowIndex, evaluation, onComplete) {
  const FLIP_MS = 280;

  for (let c = 0; c < WORD_LENGTH; c++) {
    const tile = getTile(rowIndex, c);
    const state = evaluation[c].state;

    setTimeout(() => {
      tile.classList.add("flip");
      setTimeout(() => {
        tile.classList.add(state);
      }, FLIP_MS / 2);
      tile.addEventListener("animationend", () => tile.classList.remove("flip"), { once: true });
    }, c * FLIP_MS);
  }

  setTimeout(onComplete, WORD_LENGTH * FLIP_MS + FLIP_MS);
}

function shakeRow(rowIndex) {
  const row = getRow(rowIndex);
  row.classList.remove("shake");
  void row.offsetWidth;
  row.classList.add("shake");
  row.addEventListener("animationend", () => row.classList.remove("shake"), { once: true });
}

function celebrateWin(rowIndex) {
  const row = getRow(rowIndex);
  const tiles = row.querySelectorAll(".tile");
  tiles.forEach((tile, i) => {
    setTimeout(() => {
      tile.classList.add("bounce");
      tile.addEventListener("animationend", () => tile.classList.remove("bounce"), { once: true });
    }, i * 80);
  });
  launchConfetti();
}

// ---- Confetti ----
function launchConfetti() {
  const canvas = confettiCanvas;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = "block";

  const colors = ["#3fb950","#e3b341","#58a6ff","#f78166","#bc8cff","#ff7b72","#79c0ff","#ffd700"];
  const particles = [];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: 7 + Math.random() * 9,
      h: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3.5,
      vy: 2 + Math.random() * 3.5,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 7
    });
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      p.vy += 0.06;
    });
    frame++;
    if (frame < 200) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = "none";
    }
  }
  draw();
}

// ---- Toast ----
function showToast(message, duration = 1800) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, duration);
}

// ---- End state ----
function showEndState() {
  const stats = loadStats();
  populateStats(stats);
  openModal("modal-stats");
}

// ---- Stats modal ----
function populateStats(stats) {
  document.getElementById("stat-played").textContent = stats.played;
  document.getElementById("stat-win-pct").textContent = getWinPercent(stats);
  document.getElementById("stat-streak").textContent = stats.currentStreak;
  document.getElementById("stat-max-streak").textContent = stats.maxStreak;

  const dist = document.getElementById("guess-distribution");
  dist.innerHTML = "";

  const max = Math.max(...Object.values(stats.distribution), 1);
  const lastGuess = gameState.status === "won" ? gameState.guesses.length : -1;

  for (let i = 1; i <= 6; i++) {
    const count = stats.distribution[i] || 0;
    const pct = Math.max(7, Math.round((count / max) * 100));

    const row = document.createElement("div");
    row.className = "dist-row";

    const label = document.createElement("span");
    label.className = "dist-label";
    label.textContent = i;

    const wrap = document.createElement("div");
    wrap.className = "dist-bar-wrap";

    const bar = document.createElement("div");
    bar.className = "dist-bar" + (i === lastGuess ? " highlight" : "");
    bar.style.width = "0%";
    bar.textContent = count;
    bar.dataset.pct = pct;

    wrap.appendChild(bar);
    row.appendChild(label);
    row.appendChild(wrap);
    dist.appendChild(row);
  }

  setTimeout(() => {
    dist.querySelectorAll(".dist-bar").forEach(b => {
      b.style.width = b.dataset.pct + "%";
    });
  }, 60);

  const shareSection = document.getElementById("share-section");
  shareSection.style.display = gameState.status !== "playing" ? "flex" : "none";
}

// ---- Modals ----
function openModal(id) {
  document.getElementById(id).classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
  document.body.style.overflow = "";
}

// ---- Share ----
function handleShare() {
  if (gameState.status === "playing") return;
  const text = generateShareText(
    gameState.dayNumber,
    gameState.guesses.length,
    gameState.status === "won",
    gameState.boardState
  );
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard!"));
  } else {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    showToast("Copied to clipboard!");
  }
}

// ---- Event listeners ----
function attachListeners() {
  document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Enter") handleKey("Enter");
    else if (e.key === "Backspace") handleKey("⌫");
    else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
  });

  document.getElementById("btn-help").addEventListener("click", () => openModal("modal-help"));

  document.getElementById("btn-stats").addEventListener("click", () => {
    populateStats(loadStats());
    openModal("modal-stats");
  });

  document.getElementById("close-help").addEventListener("click", () => closeModal("modal-help"));
  document.getElementById("close-stats").addEventListener("click", () => closeModal("modal-stats"));
  document.getElementById("btn-share").addEventListener("click", handleShare);

  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", () => {
      const modal = backdrop.closest(".modal");
      if (modal) closeModal(modal.id);
    });
  });

  window.addEventListener("resize", () => {
    if (confettiCanvas.style.display !== "none") {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  });
}

// ---- Start ----
init();
