const editorStatusEl = document.getElementById('editorStatus');
const editorSectionsEl = document.getElementById('editorSections');
const passwordGateEl = document.getElementById('passwordGate');
const passwordFormEl = document.getElementById('passwordForm');
const passwordInputEl = document.getElementById('passwordInput');
const passwordErrorEl = document.getElementById('passwordError');

const PASSWORD = 'emergingtech';
const AUTH_KEY = 'sudoku-editor-auth';
const GRID_SIZE = 9;
const SVG_NS = 'http://www.w3.org/2000/svg';

const LEVEL_LABELS = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const editorState = {};

const cloneCells = (cells = []) =>
  cells.map((cell) =>
    Array.isArray(cell) ? [...cell] : [cell.row, cell.col],
  );

const setGlobalStatus = (message, state = 'info') => {
  editorStatusEl.textContent = message;
  editorStatusEl.dataset.state = state;
};

const sanitizeInput = (value, { allowZero = false } = {}) => {
  let sanitized = value.replace(/[^0-9]/g, '');
  if (!allowZero) {
    sanitized = sanitized.replace(/0/g, '');
  }
  return sanitized.slice(-1);
};

const updateCellDisplay = (input) => {
  const display = input.nextElementSibling;
  if (display && display.classList.contains('editor-cell-display')) {
    display.textContent = input.value || '';
  }
};

const createEditableCell = (level, type, row, col, value, { allowZero }) => {
  const cell = document.createElement('div');
  cell.className = 'cell editor-cell';
  cell.dataset.level = level;
  cell.dataset.type = type;
  cell.dataset.row = row;
  cell.dataset.col = col;

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.maxLength = 1;
  input.autocomplete = 'off';
  input.className = 'editor-cell-input';
  input.dataset.level = level;
  input.dataset.type = type;
  input.dataset.row = row;
  input.dataset.col = col;
  input.value = value ? value : '';

  const display = document.createElement('span');
  display.className = 'editor-cell-display';
  display.textContent = input.value || '';

  if (col === 2 || col === 5) {
    cell.classList.add('subgrid-right');
  }
  if (row === 2 || row === 5) {
    cell.classList.add('subgrid-bottom');
  }

  input.addEventListener('input', (event) => {
    event.target.value = sanitizeInput(event.target.value, { allowZero });
    updateCellDisplay(event.target);
  });

  cell.appendChild(input);
  cell.appendChild(display);

  return cell;
};

const renderGrid = (level, type, values, { allowZero }) => {
  const grid = document.createElement('div');
  grid.className = 'editor-grid';
  grid.dataset.level = level;
  grid.dataset.type = type;

  values.forEach((row, rowIdx) => {
    row.forEach((value, colIdx) => {
      const cell = createEditableCell(level, type, rowIdx, colIdx, value, {
        allowZero,
      });
      grid.appendChild(cell);
    });
  });

  return grid;
};

const setSectionStatus = (section, message, state = 'info') => {
  const messageEl = section.querySelector('.editor-message');
  if (messageEl) {
    messageEl.textContent = message;
    messageEl.dataset.state = state;
  }
};

const setSectionSaving = (section, saving) => {
  const button = section.querySelector('button[data-role="save"]');
  if (button) {
    button.disabled = saving;
    button.textContent = saving ? 'Saving…' : 'Save changes';
  }
};

const collectGrid = (level, type) => {
  const values = [];
  for (let row = 0; row < 9; row += 1) {
    const rowValues = [];
    for (let col = 0; col < 9; col += 1) {
      const selector = `.editor-cell-input[data-level="${level}"][data-type="${type}"][data-row="${row}"][data-col="${col}"]`;
      const cell = document.querySelector(selector);
      const parsed = cell && cell.value ? parseInt(cell.value, 10) : 0;
      rowValues.push(Number.isNaN(parsed) ? 0 : parsed);
    }
    values.push(rowValues);
  }
  return values;
};

const isValidSolution = (grid) =>
  Array.isArray(grid) &&
  grid.length === 9 &&
  grid.every(
    (row) =>
      Array.isArray(row) &&
      row.length === 9 &&
      row.every((value) => Number.isInteger(value) && value >= 1 && value <= 9),
  );

const boardMatchesSolution = (board, solution) =>
  board.every((row, rowIdx) =>
    row.every(
      (value, colIdx) => value === 0 || value === solution[rowIdx][colIdx],
    ),
  );

const formatCell = ([row, col]) => `R${row + 1}C${col + 1}`;

const renderKropkiList = (level, section) => {
  const listEl = section.querySelector('[data-role="kropki-list"]');
  const rules = editorState[level].rules.kropki;

  if (!rules.length) {
    listEl.innerHTML =
      '<p class="rule-empty">No Kropki rules defined.</p>';
    updateRuleBadges(level, section);
    renderEditorOverlay(level, section);
    return;
  }

  listEl.innerHTML = '';
  rules.forEach((rule, index) => {
    const item = document.createElement('div');
    item.className = 'rule-item';
    const label = document.createElement('span');
    label.textContent = `${formatCell(rule.cells[0])} ↔ ${formatCell(
      rule.cells[1],
    )} — ${rule.type}`;
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'ghost';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      editorState[level].rules.kropki.splice(index, 1);
      renderKropkiList(level, section);
    });

    item.appendChild(label);
    item.appendChild(removeButton);
    listEl.appendChild(item);
  });

  updateRuleBadges(level, section);
  renderEditorOverlay(level, section);
};

const renderThermoList = (level, section) => {
  const listEl = section.querySelector('[data-role="thermo-list"]');
  const thermometers = editorState[level].rules.thermometers;

  if (!thermometers.length) {
    listEl.innerHTML = '<p class="rule-empty">No thermometers yet.</p>';
    updateRuleBadges(level, section);
    renderEditorOverlay(level, section);
    return;
  }

  listEl.innerHTML = '';
  thermometers.forEach((thermo, index) => {
    const item = document.createElement('div');
    item.className = 'rule-item';
    const label = document.createElement('span');
    const chain = thermo.cells.map((cell) => formatCell(cell)).join(' → ');
    label.textContent = chain;
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'ghost';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      editorState[level].rules.thermometers.splice(index, 1);
      renderThermoList(level, section);
    });
    item.appendChild(label);
    item.appendChild(removeButton);
    listEl.appendChild(item);
  });

  updateRuleBadges(level, section);
  renderEditorOverlay(level, section);
};

const updateRuleBadges = (level, section) => {
  const whiteCount = editorState[level].rules.kropki.filter(
    (rule) => rule.type === 'white',
  ).length;
  const blackCount = editorState[level].rules.kropki.filter(
    (rule) => rule.type === 'black',
  ).length;
  const thermoCount = editorState[level].rules.thermometers.length;

  const whiteBadge = section.querySelector('[data-role="badge-white"]');
  const blackBadge = section.querySelector('[data-role="badge-black"]');
  const thermoBadge = section.querySelector('[data-role="badge-thermo"]');

  if (whiteBadge) {
    whiteBadge.textContent = `○ White dots: ${whiteCount}`;
  }
  if (blackBadge) {
    blackBadge.textContent = `● Black dots: ${blackCount}`;
  }
  if (thermoBadge) {
    thermoBadge.textContent = `☀ Thermometers: ${thermoCount}`;
  }
};

const cellsAdjacent = (a, b) =>
  (a[0] === b[0] && Math.abs(a[1] - b[1]) === 1) ||
  (a[1] === b[1] && Math.abs(a[0] - b[0]) === 1);

const cellsDiagonalAdjacent = (a, b) =>
  Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) === 1;

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

const createOverlaySvg = () => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.classList.add('editor-board-overlay');
  return svg;
};

const renderEditorOverlay = (level, section) => {
  const overlays = section.querySelectorAll(
    '[data-role="board-overlay"], [data-role="solution-overlay"]',
  );
  overlays.forEach((overlay) => {
    overlay.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const rules = editorState[level].rules;

    rules.kropki.forEach((rule) => {
      if (!['white', 'black'].includes(rule.type)) {
        return;
      }
      if (!Array.isArray(rule.cells) || rule.cells.length !== 2) {
        return;
      }
      const cells = rule.cells
        .map((cell) => normalizeCell(cell))
        .filter(
          (cell) =>
            cell &&
            cell.row >= 0 &&
            cell.row < GRID_SIZE &&
            cell.col >= 0 &&
            cell.col < GRID_SIZE,
        );
      if (cells.length !== 2) {
        return;
      }
      const centers = cells.map((cell) => getCellCenter(cell.row, cell.col));
      const cx = ((centers[0].x + centers[1].x) / 2).toFixed(2);
      const cy = ((centers[0].y + centers[1].y) / 2).toFixed(2);
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', '1.9');
      circle.classList.add('overlay-dot', `overlay-dot-${rule.type}`);
      fragment.appendChild(circle);
    });

    rules.thermometers.forEach((thermo) => {
      if (!Array.isArray(thermo.cells) || thermo.cells.length < 2) {
        return;
      }
      const cells = thermo.cells
        .map((cell) => normalizeCell(cell))
        .filter(
          (cell) =>
            cell &&
            cell.row >= 0 &&
            cell.row < GRID_SIZE &&
            cell.col >= 0 &&
            cell.col < GRID_SIZE,
        );
      if (cells.length < 2) {
        return;
      }
      const centers = cells.map((cell) => getCellCenter(cell.row, cell.col));
      const polyline = document.createElementNS(SVG_NS, 'polyline');
      polyline.setAttribute(
        'points',
        centers.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '),
      );
      polyline.classList.add('thermo-stem');
      const bulb = document.createElementNS(SVG_NS, 'circle');
      bulb.setAttribute('cx', centers[0].x.toFixed(2));
      bulb.setAttribute('cy', centers[0].y.toFixed(2));
      bulb.setAttribute('r', '2.6');
      bulb.classList.add('thermo-bulb');
      const tip = document.createElementNS(SVG_NS, 'circle');
      tip.setAttribute('cx', centers[centers.length - 1].x.toFixed(2));
      tip.setAttribute('cy', centers[centers.length - 1].y.toFixed(2));
      tip.setAttribute('r', '1.6');
      tip.classList.add('thermo-tip');

      const group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute('opacity', '0.55');
      group.append(polyline, bulb, tip);
      fragment.appendChild(group);
    });

    overlay.appendChild(fragment);
  });
};

const collectGridValues = (section, type) => {
  const values = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const rowValues = [];
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const input = section.querySelector(
        `.editor-cell-input[data-type="${type}"][data-row="${row}"][data-col="${col}"]`,
      );
      const parsed = input ? parseInt(input.value, 10) : 0;
      rowValues.push(Number.isNaN(parsed) ? 0 : parsed);
    }
    values.push(rowValues);
  }
  return values;
};

const syncPreviewValues = (level, section) => {
  renderEditorOverlay(level, section);
};

const getBoardCellEl = (section, row, col) =>
  section.querySelector(
    `.editor-cell[data-type="board"][data-row="${row}"][data-col="${col}"]`,
  );

const highlightPendingCells = (section, pending) => {
  section
    .querySelectorAll('.editor-cell.draw-pending')
    .forEach((cell) => cell.classList.remove('draw-pending'));
  pending.forEach(({ row, col }) => {
    const cell = getBoardCellEl(section, row, col);
    if (cell) {
      cell.classList.add('draw-pending');
    }
  });
};

const updateToolButtons = (section, tool) => {
  section.querySelectorAll('.tool-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tool === tool);
  });
};

const setDrawTool = (level, section, tool) => {
  const state = editorState[level].draw;
  state.tool = tool;
  state.pending = [];
  highlightPendingCells(section, state.pending);
  updateToolButtons(section, tool);
  if (!tool) {
    setSectionStatus(section, 'Select a tool to start drawing rules.', 'info');
    const hints = section.querySelectorAll('.rule-hint');
    hints.forEach((hint) => {
      hint.textContent = 'Select a tool to begin.';
    });
    return;
  }

  if (tool === 'white' || tool === 'black') {
    const hint = section.querySelector('[data-role="kropki-hint"]');
    if (hint) {
      hint.textContent = 'Click the first cell for the dot.';
    }
  }

  if (tool === 'thermo') {
    const hint = section.querySelector('[data-role="thermo-hint"]');
    if (hint) {
      hint.textContent = 'Click cells in order; press Finish when done.';
    }
  }
};

const addKropkiRule = (level, section, cells, type) => {
  editorState[level].rules.kropki.push({
    type,
    cells: cells.map(({ row, col }) => [row, col]),
  });
  renderKropkiList(level, section);
  setSectionStatus(section, `${type} dot added.`, 'success');
};

const addThermometerRule = (level, section, cells) => {
  editorState[level].rules.thermometers.push({
    cells: cells.map(({ row, col }) => [row, col]),
  });
  renderThermoList(level, section);
  setSectionStatus(section, 'Thermometer added.', 'success');
};

const handleBoardCellClick = (level, section, row, col) => {
  const state = editorState[level].draw;
  if (!state.tool) {
    return;
  }

  const current = { row, col };
  if (state.tool === 'white' || state.tool === 'black') {
    if (!state.pending.length) {
      state.pending = [current];
      highlightPendingCells(section, state.pending);
      const hint = section.querySelector('[data-role="kropki-hint"]');
      if (hint) {
        hint.textContent = 'Select a second adjacent cell.';
      }
      return;
    }

    const first = state.pending[0];
    if (first.row === current.row && first.col === current.col) {
      return;
    }
    if (!cellsAdjacent([first.row, first.col], [current.row, current.col])) {
      setSectionStatus(section, 'Cells must be adjacent.', 'error');
      return;
    }
    addKropkiRule(level, section, [first, current], state.tool);
    state.pending = [];
    highlightPendingCells(section, state.pending);
    const hint = section.querySelector('[data-role="kropki-hint"]');
    if (hint) {
      hint.textContent = 'Select a dot type to keep drawing.';
    }
    return;
  }

  if (state.tool === 'thermo') {
    if (!state.pending.length) {
      state.pending = [current];
      highlightPendingCells(section, state.pending);
      const hint = section.querySelector('[data-role="thermo-hint"]');
      if (hint) {
        hint.textContent = 'Continue clicking adjacent cells, then press Finish.';
      }
      return;
    }
    const last = state.pending[state.pending.length - 1];
    if (
      last.row === current.row &&
      last.col === current.col
    ) {
      return;
    }
    if (
      !cellsDiagonalAdjacent(
        [last.row, last.col],
        [current.row, current.col],
      )
    ) {
      setSectionStatus(section, 'Thermometer cells must touch.', 'error');
      return;
    }
    state.pending.push(current);
    highlightPendingCells(section, state.pending);
  }
};

const finishThermometer = (level, section) => {
  const state = editorState[level].draw;
  if (state.tool !== 'thermo' || state.pending.length < 2) {
    setSectionStatus(section, 'Add at least two cells before finishing.', 'error');
    return;
  }
  addThermometerRule(level, section, state.pending);
  state.pending = [];
  highlightPendingCells(section, state.pending);
  const hint = section.querySelector('[data-role="thermo-hint"]');
  if (hint) {
    hint.textContent = 'Thermometer saved. Click again to start another.';
  }
};

const cancelDrawing = (level, section) => {
  const state = editorState[level].draw;
  state.pending = [];
  highlightPendingCells(section, state.pending);
  if (state.tool === 'thermo') {
    const hint = section.querySelector('[data-role="thermo-hint"]');
    if (hint) {
      hint.textContent = 'Select “Draw thermometer” then click the board.';
    }
  } else {
    const hint = section.querySelector('[data-role="kropki-hint"]');
    if (hint) {
      hint.textContent = 'Select a dot type to start drawing.';
    }
  }
};


const clearRules = (level, section) => {
  editorState[level].rules.kropki = [];
  editorState[level].rules.thermometers = [];
  renderKropkiList(level, section);
  renderThermoList(level, section);
  cancelDrawing(level, section);
  setDrawTool(level, section, null);
  clearInputs(section, 'solution');
  setSectionStatus(section, 'All rules cleared.', 'warning');
  syncPreviewValues(level, section);
};

const clearInputs = (section, type) => {
  section
    .querySelectorAll(`.editor-cell-input[data-type="${type}"]`)
    .forEach((cell) => {
      // eslint-disable-next-line no-param-reassign
      cell.value = '';
      updateCellDisplay(cell);
    });
};

const clearNumbers = (section) => {
  clearInputs(section, 'board');
  clearInputs(section, 'solution');
  setSectionStatus(
    section,
    'Initial and solved boards cleared. Enter new digits.',
    'warning',
  );
  const level = section.dataset.level;
  if (level) {
    syncPreviewValues(level, section);
  }
};

const saveLevel = async (level, section) => {
  const board = collectGrid(level, 'board');
  const solution = collectGrid(level, 'solution');

  if (!isValidSolution(solution)) {
    setSectionStatus(
      section,
      'Solutions must include digits 1-9 in every cell.',
      'error',
    );
    return;
  }

  if (!boardMatchesSolution(board, solution)) {
    setSectionStatus(
      section,
      'Board clues must match the solved puzzle.',
      'error',
    );
    return;
  }

  setSectionSaving(section, true);
  setSectionStatus(section, 'Saving changes…', 'info');

  try {
    const response = await fetch(`/api/admin/puzzles/${level}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board,
        solution,
        rules: editorState[level].rules,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || 'Unable to save puzzle.');
    }

    editorState[level].rules = payload.rules;
    setSectionStatus(section, 'Saved!', 'success');
    renderKropkiList(level, section);
    renderThermoList(level, section);
  } catch (error) {
    setSectionStatus(section, error.message, 'error');
  } finally {
    setSectionSaving(section, false);
  }
};

const attachRuleHandlers = (level, section) => {
  section.querySelectorAll('.tool-button').forEach((button) => {
    button.addEventListener('click', () => {
      const tool = button.dataset.tool;
      if (editorState[level].draw.tool === tool) {
        setDrawTool(level, section, null);
      } else {
        setDrawTool(level, section, tool);
      }
    });
  });

  section.querySelectorAll('button[data-role="cancel-tool"]').forEach((btn) =>
    btn.addEventListener('click', () => {
      cancelDrawing(level, section);
      setDrawTool(level, section, null);
    }),
  );

  const finishBtn = section.querySelector('button[data-role="finish-thermo"]');
  if (finishBtn) {
    finishBtn.addEventListener('click', () => finishThermometer(level, section));
  }

  section
    .querySelector('button[data-role="clear-rules"]')
    .addEventListener('click', () => clearRules(level, section));
  section
    .querySelector('button[data-role="clear-numbers"]')
    .addEventListener('click', () => clearNumbers(section));
  section
    .querySelector('button[data-role="save"]')
    .addEventListener('click', () => saveLevel(level, section));
};

const attachBoardInteractions = (level, section) => {
  section
    .querySelectorAll('.editor-cell[data-type="board"]')
    .forEach((cell) => {
      cell.addEventListener('click', () => {
        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);
        handleBoardCellClick(level, section, row, col);
      });
    });

  section
    .querySelectorAll('.editor-cell-input[data-type="board"]')
    .forEach((input) => {
      input.addEventListener('input', () => syncPreviewValues(level, section));
    });

  section
    .querySelectorAll('.editor-cell-input[data-type="solution"]')
    .forEach((cell) => {
      cell.addEventListener('input', () => syncPreviewValues(level, section));
    });
};

const renderSection = (level, puzzle) => {
  const humanLabel = LEVEL_LABELS[level] || level;
  const section = document.createElement('section');
  section.className = 'editor-section';
  section.dataset.level = level;

  editorState[level] = {
    rules: {
      kropki: (puzzle.rules?.kropki || []).map((rule) => ({
        type: rule.type,
        cells: cloneCells(rule.cells || []),
      })),
      thermometers: (puzzle.rules?.thermometers || []).map((thermo) => ({
        cells: cloneCells(thermo.cells || []),
      })),
    },
    draw: {
      tool: null,
      pending: [],
    },
  };

  section.innerHTML = `
    <div class="editor-header">
      <h2>${humanLabel}</h2>
    </div>
    <p class="status editor-message" data-state="info">
      Make edits and click “Save changes”.
    </p>
    <div class="rule-badges">
      <span class="rule-badge white" data-role="badge-white">○ White dots: 0</span>
      <span class="rule-badge black" data-role="badge-black">● Black dots: 0</span>
      <span class="rule-badge thermo" data-role="badge-thermo">☀ Thermometers: 0</span>
    </div>
    <div class="editor-grids">
      <div class="editor-grid-wrapper">
        <h3>Initial Board</h3>
        <div class="editor-board-stack">
          <div data-role="board-grid"></div>
          <svg
            class="editor-board-overlay"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            data-role="board-overlay"
          ></svg>
        </div>
      </div>
      <div class="editor-grid-wrapper">
        <h3>Solved Board</h3>
        <div class="editor-board-stack">
          <div data-role="solution-grid"></div>
          <svg
            class="editor-board-overlay"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            data-role="solution-overlay"
          ></svg>
        </div>
      </div>
    </div>
    <div class="rule-sections">
      <div class="rule-card">
        <div class="rule-card-header">
          <h3>Kropki dots</h3>
          <p>Pick a dot type, then click two adjacent cells on the board.</p>
        </div>
        <div class="rule-tools">
          <button type="button" class="secondary tool-button" data-tool="white">
            White dot
          </button>
          <button type="button" class="secondary tool-button" data-tool="black">
            Black dot
          </button>
          <button type="button" class="ghost" data-role="cancel-tool">
            Cancel
          </button>
        </div>
        <p class="rule-hint" data-role="kropki-hint">
          Select a dot type to start drawing.
        </p>
        <div class="rule-list" data-role="kropki-list"></div>
      </div>
      <div class="rule-card">
        <div class="rule-card-header">
          <h3>Thermometer rules</h3>
          <p>Click cells in order to trace a thermometer path.</p>
        </div>
        <div class="rule-tools">
          <button
            type="button"
            class="secondary tool-button"
            data-tool="thermo"
          >
            Draw thermometer
          </button>
          <button type="button" class="ghost" data-role="finish-thermo">
            Finish
          </button>
          <button type="button" class="ghost" data-role="cancel-tool">
            Cancel
          </button>
        </div>
        <p class="rule-hint" data-role="thermo-hint">
          Select “Draw thermometer” then click the board.
        </p>
        <div class="rule-list" data-role="thermo-list"></div>
      </div>
    </div>
    <div class="editor-actions">
      <button type="button" class="secondary" data-role="clear-numbers">
        Clear numbers
      </button>
      <button type="button" class="secondary" data-role="clear-rules">
        Clear rules
      </button>
      <button type="button" class="primary" data-role="save">
        Save changes
      </button>
    </div>
  `;

  const boardGridHost = section.querySelector('[data-role="board-grid"]');
  const boardStack = document.createElement('div');
  boardStack.className = 'editor-board-stack';
  const boardGrid = renderGrid(level, 'board', puzzle.board, {
    allowZero: true,
  });
  const boardOverlay = createOverlaySvg();
  boardOverlay.dataset.role = 'board-overlay';
  boardStack.append(boardGrid, boardOverlay);
  boardGridHost.appendChild(boardStack);

  const solutionGridHost = section.querySelector(
    '[data-role="solution-grid"]',
  );
  const solutionStack = document.createElement('div');
  solutionStack.className = 'editor-board-stack';
  const solutionGrid = renderGrid(level, 'solution', puzzle.solution, {
    allowZero: false,
  });
  const solutionOverlay = createOverlaySvg();
  solutionOverlay.dataset.role = 'solution-overlay';
  solutionStack.append(solutionGrid, solutionOverlay);
  solutionGridHost.appendChild(solutionStack);

  attachRuleHandlers(level, section);
  attachBoardInteractions(level, section);
  renderKropkiList(level, section);
  renderThermoList(level, section);
  syncPreviewValues(level, section);

  return section;
};

const loadPuzzles = async () => {
  setGlobalStatus('Loading puzzles…', 'info');
  try {
    const response = await fetch('/api/admin/puzzles');
    if (!response.ok) {
      throw new Error('Unable to load puzzles.');
    }
    const data = await response.json();
    editorSectionsEl.innerHTML = '';
    Object.entries(data).forEach(([level, puzzle]) => {
      editorSectionsEl.appendChild(renderSection(level, puzzle));
    });
    setGlobalStatus('Ready to edit.', 'success');
  } catch (error) {
    setGlobalStatus(error.message, 'error');
  }
};

const unlockEditor = () => {
  passwordGateEl.classList.add('hidden');
  sessionStorage.setItem(AUTH_KEY, 'ok');
  loadPuzzles();
};

const handlePasswordSubmit = (event) => {
  event.preventDefault();
  const value = (passwordInputEl.value || '').trim();
  if (value === PASSWORD) {
    passwordErrorEl.textContent = '';
    unlockEditor();
    return;
  }
  passwordErrorEl.textContent = 'Incorrect password. Please try again.';
  passwordInputEl.value = '';
  passwordInputEl.focus();
};

if (passwordFormEl) {
  passwordFormEl.addEventListener('submit', handlePasswordSubmit);
}

if (sessionStorage.getItem(AUTH_KEY) === 'ok') {
  passwordGateEl.classList.add('hidden');
  loadPuzzles();
} else {
  passwordGateEl.classList.remove('hidden');
  setGlobalStatus('Enter the password to begin editing.', 'info');
}


