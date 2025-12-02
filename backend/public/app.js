const boardEl = document.getElementById('board');
const overlayEl = document.getElementById('boardOverlay');
const statusEl = document.getElementById('status');
const newPuzzleBtn = document.getElementById('newPuzzle');
const checkPuzzleBtn = document.getElementById('checkPuzzle');
const noteModeToggle = document.getElementById('noteModeToggle');
const levelSelect = document.getElementById('levelSelect');

const SVG_NS = 'http://www.w3.org/2000/svg';
const GRID_SIZE = 9;
const DEFAULT_VICTORY_MESSAGE = 'Great job! Puzzle solved! Load a new puzzle?';

let currentLevel = levelSelect.value;
let boardLoaded = false;
let currentRules = { kropki: [], thermometers: [] };
let noteMode = false;
const notesState = new Map();

const setStatus = (message, state = 'info') => {
  statusEl.textContent = message;
  statusEl.dataset.state = state;
};

const normalizeRules = (rules = {}) => ({
  kropki: Array.isArray(rules.kropki) ? rules.kropki : [],
  thermometers: Array.isArray(rules.thermometers) ? rules.thermometers : [],
});

const setButtonsDisabled = (disabled) => {
  newPuzzleBtn.disabled = disabled;
  levelSelect.disabled = disabled;
  checkPuzzleBtn.disabled = disabled || !boardLoaded;
};

const clearOverlay = () => {
  if (overlayEl) {
    overlayEl.innerHTML = '';
  }
};

const clearBoard = () => {
  boardEl.innerHTML = '';
  clearOverlay();
  notesState.clear();
};

const clearHighlights = () => {
  document
    .querySelectorAll('.cell.error')
    .forEach((cell) => cell.classList.remove('error'));
};

const getCellKey = (row, col) => `${row}-${col}`;

const isInBounds = (value) => Number.isInteger(value) && value >= 0 && value < GRID_SIZE;

const getCellInputElement = (row, col) =>
  boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"] .cell-input`);

const moveFocus = (row, col, deltaRow, deltaCol) => {
  let nextRow = row + deltaRow;
  let nextCol = col + deltaCol;

  while (isInBounds(nextRow) && isInBounds(nextCol)) {
    const nextInput = getCellInputElement(nextRow, nextCol);
    if (nextInput) {
      nextInput.focus();
      return;
    }
    nextRow += deltaRow;
    nextCol += deltaCol;
  }
};

const updateCellNotes = (row, col) => {
  const cell = boardEl.querySelector(
    `.cell[data-row="${row}"][data-col="${col}"]`,
  );
  if (!cell) return;
  const notesEl = cell.querySelector('.cell-notes');
  const set = notesState.get(getCellKey(row, col));
  const notes = set ? Array.from(set).sort() : [];
  notesEl.textContent = notes.join(' ');
  cell.classList.toggle('has-notes', notes.length > 0);
};

const toggleNoteValue = (row, col, digit) => {
  if (!digit) return;
  const key = getCellKey(row, col);
  const set = notesState.get(key) || new Set();
  if (set.has(digit)) {
    set.delete(digit);
  } else {
    set.add(digit);
  }
  if (set.size === 0) {
    notesState.delete(key);
  } else {
    notesState.set(key, set);
  }
  updateCellNotes(row, col);
};

const clearNotesForCell = (row, col) => {
  const key = getCellKey(row, col);
  if (notesState.has(key)) {
    notesState.delete(key);
    updateCellNotes(row, col);
  }
};

const handleCellKeydown = (event, row, col) => {
  const isPreset = event.target?.dataset?.preset === 'true';
  const navigation = {
    ArrowUp: { dr: -1, dc: 0 },
    ArrowDown: { dr: 1, dc: 0 },
    ArrowLeft: { dr: 0, dc: -1 },
    ArrowRight: { dr: 0, dc: 1 },
  };

  const direction = navigation[event.key];
  if (direction) {
    event.preventDefault();
    moveFocus(row, col, direction.dr, direction.dc);
    return;
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && !isPreset) {
    const hasValue = Boolean(event.target.value);
    const hasNotes = notesState.has(getCellKey(row, col));
    if (hasValue || hasNotes) {
      event.preventDefault();
      event.target.value = '';
      event.target.classList.remove('error');
      clearNotesForCell(row, col);
    }
  }
};

const refreshAllNotes = () => {
  boardEl.querySelectorAll('.cell').forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    updateCellNotes(row, col);
  });
};

const handleCellInput = (event, row, col) => {
  const sanitized = event.target.value.replace(/[^1-9]/g, '');
  if (noteMode) {
    const digit = sanitized.slice(-1);
    event.target.value = '';
    toggleNoteValue(row, col, digit);
    return;
  }

  event.target.value = sanitized.slice(-1);
  event.target.classList.remove('error');
  if (event.target.value) {
    clearNotesForCell(row, col);
  }
};

const createCell = (value, row, col) => {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.dataset.row = row;
  cell.dataset.col = col;

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.maxLength = 1;
  input.autocomplete = 'off';
  input.className = 'cell-input';

  if (col === 2 || col === 5) {
    cell.classList.add('subgrid-right');
  }
  if (row === 2 || row === 5) {
    cell.classList.add('subgrid-bottom');
  }

  if (value) {
    input.value = value;
    input.readOnly = true;
    input.dataset.preset = 'true';
    cell.classList.add('preset');
  } else {
    input.value = '';
    input.addEventListener('input', (event) => handleCellInput(event, row, col));
    input.addEventListener('focus', () => {
      input.select();
      if (noteMode) {
        cell.classList.add('cell-note-mode');
      }
    });
    input.addEventListener('blur', () => {
      cell.classList.remove('cell-note-mode');
    });
  }

  input.addEventListener('keydown', (event) => handleCellKeydown(event, row, col));

  const notesLayer = document.createElement('div');
  notesLayer.className = 'cell-notes';

  cell.appendChild(input);
  cell.appendChild(notesLayer);
  return cell;
};

const renderBoard = (board) => {
  clearBoard();
  board.forEach((row, rowIdx) => {
    row.forEach((value, colIdx) => {
      const cell = createCell(value, rowIdx, colIdx);
      boardEl.appendChild(cell);
      updateCellNotes(rowIdx, colIdx);
    });
  });
};

const createSvgElement = (tag, attrs = {}) => {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });
  return el;
};

const normalizeCell = (cell) => {
  if (Array.isArray(cell) && cell.length === 2) {
    return { row: Number(cell[0]), col: Number(cell[1]) };
  }
  if (
    cell &&
    typeof cell === 'object' &&
    Number.isFinite(cell.row) &&
    Number.isFinite(cell.col)
  ) {
    return { row: Number(cell.row), col: Number(cell.col) };
  }
  return null;
};

const getCellCenter = (row, col) => ({
  x: ((col + 0.5) / GRID_SIZE) * 100,
  y: ((row + 0.5) / GRID_SIZE) * 100,
});

const renderRulesOverlay = (rules = { kropki: [], thermometers: [] }) => {
  if (!overlayEl) return;
  clearOverlay();
  const fragment = document.createDocumentFragment();

  rules.kropki.forEach((rule) => {
    if (!['white', 'black'].includes(rule.type)) {
      return;
    }
    if (!Array.isArray(rule.cells) || rule.cells.length !== 2) {
      return;
    }
    const cells = rule.cells
      .map((cell) => normalizeCell(cell))
      .filter((cell) => cell && isInBounds(cell.row) && isInBounds(cell.col));

    if (cells.length !== 2) {
      return;
    }

    const centers = cells.map((cell) => getCellCenter(cell.row, cell.col));
    const centerX = (centers[0].x + centers[1].x) / 2;
    const centerY = (centers[0].y + centers[1].y) / 2;
    const cx = centerX.toFixed(2);
    const cy = centerY.toFixed(2);
    const circle = createSvgElement('circle', {
      cx,
      cy,
      r: 1.9,
    });
    circle.classList.add('overlay-dot', `overlay-dot-${rule.type}`);
    fragment.appendChild(circle);
  });

  rules.thermometers.forEach((thermo) => {
    if (!Array.isArray(thermo.cells) || thermo.cells.length < 2) {
      return;
    }
    const cells = thermo.cells
      .map((cell) => normalizeCell(cell))
      .filter((cell) => cell && isInBounds(cell.row) && isInBounds(cell.col));
    if (cells.length < 2) {
      return;
    }

    const centers = cells.map((cell) => getCellCenter(cell.row, cell.col));
    const points = centers.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

    const group = createSvgElement('g');
    group.setAttribute('opacity', '0.55');
    const stem = createSvgElement('polyline', { points });
    stem.classList.add('thermo-stem');
    const bulb = createSvgElement('circle', {
      cx: centers[0].x.toFixed(2),
      cy: centers[0].y.toFixed(2),
      r: 2.6,
    });
    bulb.classList.add('thermo-bulb');
    const tip = createSvgElement('circle', {
      cx: centers[centers.length - 1].x.toFixed(2),
      cy: centers[centers.length - 1].y.toFixed(2),
      r: 1.6,
    });
    tip.classList.add('thermo-tip');
    group.appendChild(stem);
    group.appendChild(bulb);
    group.appendChild(tip);
    fragment.appendChild(group);
  });

  overlayEl.appendChild(fragment);
};

const getBoardValues = () => {
  const values = [];
  for (let row = 0; row < 9; row += 1) {
    const currentRow = [];
    for (let col = 0; col < 9; col += 1) {
      const selector = `.cell[data-row="${row}"][data-col="${col}"]`;
      const cell = document.querySelector(selector);
      const input = cell ? cell.querySelector('.cell-input') : null;
      const parsed = input ? parseInt(input.value, 10) : 0;
      currentRow.push(Number.isNaN(parsed) ? 0 : parsed);
    }
    values.push(currentRow);
  }
  return values;
};

const highlightErrors = ({ incorrect = [], empty = [] }) => {
  boardEl.querySelectorAll('.cell').forEach((cell) => {
    cell.classList.remove('error', 'error-empty');
  });
  incorrect.forEach(({ row, col }) => {
    const cell = document.querySelector(
      `.cell[data-row="${row}"][data-col="${col}"]`,
    );
    if (!cell) return;
    const input = cell.querySelector('.cell-input');
    if (input && input.dataset.preset !== 'true') {
      cell.classList.add('error');
    }
  });
  empty.forEach(({ row, col }) => {
    const cell = document.querySelector(
      `.cell[data-row="${row}"][data-col="${col}"]`,
    );
    if (!cell) return;
    const input = cell.querySelector('.cell-input');
    if (input && input.dataset.preset !== 'true') {
      cell.classList.add('error-empty');
    }
  });
};

const loadPuzzle = async (level = currentLevel) => {
  setButtonsDisabled(true);
  setStatus(`Fetching the ${level} puzzle…`, 'info');
  clearBoard();
  clearHighlights();

  try {
    const response = await fetch(`/api/puzzles/${level}`);
    if (!response.ok) {
      throw new Error('Unable to fetch puzzle. Please try again.');
    }
    const data = await response.json();
    currentLevel = data.level || level;
    levelSelect.value = currentLevel;
    boardLoaded = true;
    renderBoard(data.board);
    currentRules = normalizeRules(data.rules);
    renderRulesOverlay(currentRules);
    noteMode = false;
    noteModeToggle.classList.remove('active');
    noteModeToggle.textContent = 'Notes Off';
    setStatus(
      `You’re on the ${currentLevel} board. Press “Check Solution” when ready.`,
      'info',
    );
  } catch (error) {
    boardLoaded = false;
    currentRules = { kropki: [], thermometers: [] };
    clearOverlay();
    setStatus(error.message, 'error');
  } finally {
    setButtonsDisabled(false);
  }
};

const checkSolution = async () => {
  if (!boardLoaded) {
    setStatus('Please load a puzzle first.', 'warning');
    return;
  }

  setButtonsDisabled(true);
  setStatus('Checking solution…', 'info');

  try {
    const response = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: currentLevel, board: getBoardValues() }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || 'Validation failed.');
    }

    if (payload.success) {
      clearHighlights();
      const victoryMessage =
        payload.victoryMessage && payload.victoryMessage.trim()
          ? payload.victoryMessage.trim()
          : DEFAULT_VICTORY_MESSAGE;
      setStatus(victoryMessage, 'success');
      notesState.clear();
      refreshAllNotes();
    } else {
      highlightErrors(payload.errors || {});
      setStatus(
        'Not quite yet—numbers in red are incorrect, yellow are empty, and black givens stay locked.',
        'warning',
      );
    }
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    setButtonsDisabled(false);
  }
};

newPuzzleBtn.addEventListener('click', () => loadPuzzle(currentLevel));
checkPuzzleBtn.addEventListener('click', checkSolution);
levelSelect.addEventListener('change', (event) =>
  loadPuzzle(event.target.value),
);
noteModeToggle.addEventListener('click', () => {
  noteMode = !noteMode;
  noteModeToggle.classList.toggle('active', noteMode);
  noteModeToggle.textContent = noteMode ? 'Notes On' : 'Notes Off';
  if (!noteMode) {
    boardEl
      .querySelectorAll('.cell-note-mode')
      .forEach((cell) => cell.classList.remove('cell-note-mode'));
  }
  const active = document.activeElement;
  if (active && active.classList.contains('cell-input')) {
    const wrapper = active.closest('.cell');
    if (wrapper) {
      wrapper.classList.toggle('cell-note-mode', noteMode);
    }
  }
});

loadPuzzle(currentLevel);

