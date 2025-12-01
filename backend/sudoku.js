const BASE = 3;
const SIDE = BASE * BASE;

const range = (size) => Array.from({ length: size }, (_, idx) => idx);

const shuffle = (items) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const pattern = (row, col) =>
  (BASE * (row % BASE) + Math.floor(row / BASE) + col) % SIDE;

const buildSolvedBoard = () => {
  const rows = [];
  const cols = [];
  const rowBands = shuffle(range(BASE));
  const colBands = shuffle(range(BASE));

  rowBands.forEach((band) => {
    shuffle(range(BASE)).forEach((row) => rows.push(band * BASE + row));
  });

  colBands.forEach((band) => {
    shuffle(range(BASE)).forEach((col) => cols.push(band * BASE + col));
  });

  const nums = shuffle(range(SIDE).map((n) => n + 1));

  return rows.map((r) => cols.map((c) => nums[pattern(r, c)]));
};

const carvePuzzle = (board, emptyCells) => {
  const maxCells = SIDE * SIDE;
  const holes = Math.min(Math.max(emptyCells, 0), maxCells);
  const puzzle = board.map((row) => [...row]);
  const cells = shuffle(range(maxCells));

  for (let i = 0; i < holes; i += 1) {
    const cell = cells[i];
    const row = Math.floor(cell / SIDE);
    const col = cell % SIDE;
    puzzle[row][col] = 0;
  }
  return puzzle;
};

const generatePuzzle = (difficulty = 45) => {
  const solution = buildSolvedBoard();
  const board = carvePuzzle(solution, difficulty);
  return { board, solution };
};

module.exports = {
  generatePuzzle,
};

