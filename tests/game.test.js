const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = [
  fs.readFileSync(path.join(root, "js", "words.js"), "utf8"),
  fs.readFileSync(path.join(root, "js", "game.js"), "utf8"),
  "this.ANSWERS = ANSWERS;",
  "this.VALID_WORDS = VALID_WORDS;",
  "this.evaluateGuess = evaluateGuess;",
  "this.isValidWord = isValidWord;"
].join("\n");

const context = {
  Date,
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  }
};

vm.createContext(context);
vm.runInContext(source, context);

function states(result) {
  return Array.from(result, tile => tile.state);
}

assert.equal(context.ANSWERS.length, new Set(context.ANSWERS).size, "answers should be unique");

for (const word of context.ANSWERS) {
  assert.equal(word.length, 5, `${word} should be a 5-letter answer`);
  assert.equal(context.isValidWord(word.toUpperCase()), true, `${word} should be accepted as valid`);
}

for (const word of context.VALID_WORDS) {
  assert.equal(word.length, 5, `${word} should be a 5-letter valid guess`);
}

assert.deepEqual(
  states(context.evaluateGuess("HELIX", "HELIX")),
  ["correct", "correct", "correct", "correct", "correct"],
  "exact matches should mark every tile correct"
);

assert.deepEqual(
  states(context.evaluateGuess("ALLOT", "LLAMA")),
  ["present", "correct", "present", "absent", "absent"],
  "repeated letters should only be counted as many times as they appear"
);

assert.deepEqual(
  states(context.evaluateGuess("BELLE", "LEVEL")),
  ["absent", "correct", "present", "present", "present"],
  "duplicate guessed letters should respect the remaining answer pool"
);

console.log("All WordTap tests passed.");
