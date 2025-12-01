# Sudoku App

Basic Sudoku game with a Node.js/Express backend that serves puzzles and validates solutions, plus a lightweight frontend rendered from the same server.

## Requirements

- Node.js 18+ (includes npm)

## Getting started

```bash
cd backend
npm install
npm start
```

Then open [http://localhost:3001](http://localhost:3001) in your browser.

## Gameplay

- Choose a difficulty (Easy, Medium, Hard) from the dropdown.
- Click **New Puzzle** to load that board, fill in the blanks, then hit **Check Solution**.
- Toggle **Notes** mode to jot pencil-marks; digits typed with notes on become light annotations behind the bold primary number.

## Editing puzzles

- Visit [http://localhost:3001/edit.html](http://localhost:3001/edit.html) and enter the password `emergingtech` to unlock the editor.
- Update the initial board (use `0` or leave blank for empties) and the solved board, then draw constraints directly on the board: pick a white/black dot tool and click two adjacent cells, or start a thermometer and click a path before pressing **Finish**. Active cells glow so you can see what’s queued.
- Use the built-in **Clear numbers** / **Clear rules** buttons if you want to start from scratch.
- All puzzle data (including rules) lives in `backend/data/puzzles.json`. You can also edit this file directly if you prefer.

## API overview

- `GET /api/puzzles` – returns available levels plus their initial boards.
- `GET /api/puzzles/:level` – returns the initial board for a specific level.
- `POST /api/validate` – body `{ level, board }`; compares against the stored solution and returns `{ success, errors }`.
- `GET /api/admin/puzzles` – returns every board, solution, and rule set (used by the editor UI).
- `PUT /api/admin/puzzles/:level` – body `{ board, solution, rules }`; updates a given level after validation.

## Project structure

- `backend/server.js` – Express server, API routes, static hosting.
- `backend/storage.js` – reads/writes puzzle data.
- `backend/data/puzzles.json` – persisted Sudoku boards for each difficulty.
- `backend/sudoku.js` – optional puzzle generation helpers.
- `backend/public/*` – static frontend (HTML, CSS, JS).

Feel free to tweak `generatePuzzle` if you want easier or harder templates, or edit `puzzles.json` directly for full control.

