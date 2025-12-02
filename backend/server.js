const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  LEVELS,
  getAllPuzzles,
  getPuzzle,
  savePuzzle,
  DEFAULT_RULES,
} = require('./storage');

const app = express();
const PORT = process.env.PORT || 3001;
const VALID_KROPKI_TYPES = ['white', 'black', 'domino'];
const VICTORY_MESSAGES = {
  easy: 'Great job! Flag is: flag{SUDOKUNOTSODUKO}',
  medium: 'Great job! Flag is: flag{KropkiMaster}',
  hard: 'Great job! Flag is: flag{Thermostat}',
};

const getVictoryMessage = (level) =>
  VICTORY_MESSAGES[level] || 'Great job! Puzzle solved! Load a new puzzle?';

app.use(cors());
app.use(express.json());

const toNumber = (value) => {
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const isValidRow = (row, { allowZero = false } = {}) =>
  Array.isArray(row) &&
  row.length === 9 &&
  row.every((value) => {
    const num = toNumber(value);
    if (!Number.isInteger(num)) {
      return false;
    }
    const min = allowZero ? 0 : 1;
    return num >= min && num <= 9;
  });

const isValidBoard = (board, { allowZero = false } = {}) =>
  Array.isArray(board) &&
  board.length === 9 &&
  board.every((row) => isValidRow(row, { allowZero }));

const parseCell = (cell) => {
  if (
    Array.isArray(cell) &&
    cell.length === 2 &&
    Number.isInteger(cell[0]) &&
    Number.isInteger(cell[1])
  ) {
    return [cell[0], cell[1]];
  }
  if (
    cell &&
    typeof cell === 'object' &&
    Number.isInteger(cell.row) &&
    Number.isInteger(cell.col)
  ) {
    return [cell.row, cell.col];
  }
  return null;
};

const inBounds = (row, col) => row >= 0 && row < 9 && col >= 0 && col < 9;

const areOrthAdjacent = (cellA, cellB) =>
  (cellA[0] === cellB[0] && Math.abs(cellA[1] - cellB[1]) === 1) ||
  (cellA[1] === cellB[1] && Math.abs(cellA[0] - cellB[0]) === 1);

const areAdjacent = (cellA, cellB) =>
  Math.max(Math.abs(cellA[0] - cellB[0]), Math.abs(cellA[1] - cellB[1])) === 1;

const cellsAreContiguous = (cells, { allowDiagonal = false } = {}) =>
  cells.every((cell, index) => {
    if (index === 0) {
      return true;
    }
    const prev = cells[index - 1];
    return allowDiagonal
      ? areAdjacent(prev, cell)
      : areOrthAdjacent(prev, cell);
  });

const normalizeRulesPayload = (rules = DEFAULT_RULES()) => {
  const normalized = DEFAULT_RULES();

  if (Array.isArray(rules.kropki)) {
    // eslint-disable-next-line no-restricted-syntax
    for (const rawRule of rules.kropki) {
      const type = String(rawRule.type || '').toLowerCase();
      if (!VALID_KROPKI_TYPES.includes(type)) {
        return {
          ok: false,
          message: 'Kropki/domino rules must include a valid type.',
        };
      }

      if (!Array.isArray(rawRule.cells) || rawRule.cells.length !== 2) {
        return {
          ok: false,
          message: 'Kropki/domino rules require exactly two cells.',
        };
      }

      const cells = rawRule.cells.map(parseCell);
      if (
        cells.some((cell) => !cell || !inBounds(cell[0], cell[1])) ||
        !areOrthAdjacent(cells[0], cells[1])
      ) {
        return {
          ok: false,
          message:
            'Kropki/domino rules must reference adjacent in-bounds cells.',
        };
      }

      normalized.kropki.push({ type, cells });
    }
  }

  if (Array.isArray(rules.thermometers)) {
    // eslint-disable-next-line no-restricted-syntax
    for (const thermometer of rules.thermometers) {
      if (!Array.isArray(thermometer.cells) || thermometer.cells.length < 2) {
        return {
          ok: false,
          message: 'Thermometers need at least two cells.',
        };
      }

      const cells = thermometer.cells.map(parseCell);
      if (cells.some((cell) => !cell || !inBounds(cell[0], cell[1]))) {
        return {
          ok: false,
          message: 'Thermometer cells must be in-bounds.',
        };
      }

      if (!cellsAreContiguous(cells, { allowDiagonal: true })) {
        return {
          ok: false,
          message:
            'Thermometer cells must form a contiguous orthogonal chain.',
        };
      }

      normalized.thermometers.push({ cells });
    }
  }

  return { ok: true, value: normalized };
};

app.get('/api/puzzles', (req, res) => {
  const puzzles = getAllPuzzles();
  const sanitized = Object.entries(puzzles).reduce((acc, [level, value]) => {
    acc[level] = {
      board: value.board,
      rules: value.rules || DEFAULT_RULES(),
    };
    return acc;
  }, {});
  res.json({ levels: LEVELS, puzzles: sanitized });
});

app.get('/api/puzzles/:level', (req, res) => {
  const level = (req.params.level || '').toLowerCase();
  const puzzle = getPuzzle(level);
  if (!puzzle) {
    return res.status(404).json({ message: 'Puzzle not found.' });
  }
  return res.json({
    level,
    board: puzzle.board,
    rules: puzzle.rules,
  });
});

app.post('/api/validate', (req, res) => {
  const { level, board } = req.body || {};
  const normalizedLevel = (level || '').toLowerCase();

  if (!normalizedLevel || !isValidBoard(board, { allowZero: true })) {
    return res.status(400).json({ message: 'Invalid board payload.' });
  }

  const puzzle = getPuzzle(normalizedLevel);
  if (!puzzle) {
    return res.status(404).json({ message: 'Puzzle not found.' });
  }

  const errors = [];
  const normalizedBoard = board.map((row) =>
    row.map((value) => toNumber(value) || 0),
  );

  normalizedBoard.forEach((row, rowIdx) => {
    row.forEach((value, colIdx) => {
      if (value !== puzzle.solution[rowIdx][colIdx]) {
        errors.push({ row: rowIdx, col: colIdx });
      }
    });
  });

  const success = errors.length === 0;

  if (success) {
    const victoryMessage = getVictoryMessage(normalizedLevel);
    return res.json({ success, errors, victoryMessage });
  }

  return res.json({ success, errors });
});

app.get('/api/admin/puzzles', (req, res) => {
  res.json(getAllPuzzles());
});

app.put('/api/admin/puzzles/:level', (req, res) => {
  const level = (req.params.level || '').toLowerCase();
  const { board, solution, rules } = req.body || {};

  if (!isValidBoard(board, { allowZero: true }) || !isValidBoard(solution)) {
    return res
      .status(400)
      .json({ message: 'Board and solution must be 9×9 grids.' });
  }

  const mismatch = board.some((row, rowIdx) =>
    row.some(
      (value, colIdx) =>
        value !== 0 && value !== solution[rowIdx][colIdx],
    ),
  );

  if (mismatch) {
    return res
      .status(400)
      .json({ message: 'Board clues must match the provided solution.' });
  }

  const normalizedRules = normalizeRulesPayload(rules);
  if (!normalizedRules.ok) {
    return res.status(400).json({ message: normalizedRules.message });
  }

  const existingPuzzle = getPuzzle(level);
  if (!existingPuzzle) {
    return res.status(404).json({ message: 'Unknown puzzle level.' });
  }

  const saved = savePuzzle(level, {
    board,
    solution,
    rules: normalizedRules.value,
  });

  return res.json({
    level,
    board: saved.board,
    solution: saved.solution,
    rules: saved.rules,
    victoryMessage: getVictoryMessage(level),
  });
});

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Sudoku server listening on http://localhost:${PORT}`);
});

