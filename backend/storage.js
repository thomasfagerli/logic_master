const fs = require('fs');
const path = require('path');

const LEVELS = ['easy', 'medium', 'hard'];
const DATA_FILE = path.join(__dirname, 'data', 'puzzles.json');

const DEFAULT_RULES = () => ({
  kropki: [],
  thermometers: [],
});

const readJSON = () => {
  const file = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(file);
};

const writeJSON = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const normalizeLevel = (level) => {
  const normalized = String(level || '').toLowerCase();
  return LEVELS.includes(normalized) ? normalized : null;
};

const normalizeRules = (rules = {}) => {
  const normalized = DEFAULT_RULES();
  if (Array.isArray(rules.kropki)) {
    normalized.kropki = rules.kropki;
  }
  if (Array.isArray(rules.thermometers)) {
    normalized.thermometers = rules.thermometers;
  }
  return normalized;
};

const normalizePuzzle = (puzzle = {}) => ({
  board: puzzle.board || [],
  solution: puzzle.solution || [],
  rules: normalizeRules(puzzle.rules),
});

const getAllPuzzles = () => {
  const raw = readJSON();
  return Object.entries(raw).reduce((acc, [level, puzzle]) => {
    acc[level] = normalizePuzzle(puzzle);
    return acc;
  }, {});
};

const getPuzzle = (level) => {
  const normalized = normalizeLevel(level);
  if (!normalized) {
    return null;
  }
  const puzzles = getAllPuzzles();
  return puzzles[normalized] || null;
};

const savePuzzle = (level, payload) => {
  const normalized = normalizeLevel(level);
  if (!normalized) {
    return null;
  }

  const puzzles = getAllPuzzles();
  puzzles[normalized] = normalizePuzzle(payload);
  writeJSON(puzzles);
  return puzzles[normalized];
};

module.exports = {
  LEVELS,
  getAllPuzzles,
  getPuzzle,
  savePuzzle,
  DEFAULT_RULES,
};

