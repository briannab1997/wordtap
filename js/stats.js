const STATS_KEY = "wordtap_stats";

function loadStats() {
  const raw = localStorage.getItem(STATS_KEY);
  if (!raw) return defaultStats();
  try {
    return JSON.parse(raw);
  } catch {
    return defaultStats();
  }
}

function defaultStats() {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    lastPlayedDay: null,
    lastWonDay: null
  };
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function updateStats(won, guessCount, dayNumber) {
  const stats = loadStats();

  if (stats.lastPlayedDay === dayNumber) return stats;

  stats.played++;

  if (won) {
    stats.wins++;
    stats.distribution[guessCount]++;

    if (stats.lastWonDay === dayNumber - 1) {
      stats.currentStreak++;
    } else {
      stats.currentStreak = 1;
    }

    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.lastWonDay = dayNumber;
  } else {
    stats.currentStreak = 0;
  }

  stats.lastPlayedDay = dayNumber;
  saveStats(stats);
  return stats;
}

function getWinPercent(stats) {
  if (stats.played === 0) return 0;
  return Math.round((stats.wins / stats.played) * 100);
}

function generateShareText(dayNumber, guessCount, won, boardState) {
  const result = won ? guessCount : "X";
  let text = `WordTap #${dayNumber} ${result}/6\n\n`;

  for (const row of boardState) {
    let line = "";
    for (const tile of row) {
      if (tile.state === "correct") line += "🟩";
      else if (tile.state === "present") line += "🟨";
      else line += "⬛";
    }
    text += line + "\n";
  }

  text += "\nhttps://briannab1997.github.io/wordtap";
  return text.trim();
}
