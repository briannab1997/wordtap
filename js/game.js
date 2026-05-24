const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const EPOCH = new Date(2025, 0, 1); // Jan 1, 2025

function getDayNumber() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = today - EPOCH;
  return Math.floor(diff / 86400000) + 1;
}

function getDailyWord() {
  const day = getDayNumber();
  const index = day % ANSWERS.length;
  return ANSWERS[index].toUpperCase();
}

function isValidWord(word) {
  return VALID_WORDS.has(word.toLowerCase());
}

function evaluateGuess(guess, answer) {
  const result = Array(WORD_LENGTH).fill(null).map((_, i) => ({
    letter: guess[i],
    state: "absent"
  }));

  const answerChars = answer.split("");
  const guessChars = guess.split("");

  // First pass: mark correct
  const answerPool = [];
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i].state = "correct";
      answerPool.push(null);
    } else {
      answerPool.push(answerChars[i]);
    }
  }

  // Second pass: mark present
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i].state === "correct") continue;
    const idx = answerPool.indexOf(guessChars[i]);
    if (idx !== -1) {
      result[i].state = "present";
      answerPool[idx] = null;
    }
  }

  return result;
}

function createGameState() {
  return {
    answer: getDailyWord(),
    dayNumber: getDayNumber(),
    guesses: [],
    currentRow: 0,
    currentInput: [],
    status: "playing", // "playing" | "won" | "lost"
    isRevealing: false,
    boardState: []
  };
}

function loadSavedGame() {
  const key = "wordtap_game";
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    if (saved.dayNumber !== getDayNumber()) return null;
    saved.isRevealing = false;
    return saved;
  } catch {
    return null;
  }
}

function saveGame(state) {
  localStorage.setItem("wordtap_game", JSON.stringify(state));
}
