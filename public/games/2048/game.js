const boardElement = document.querySelector('#game-board');
const scoreElement = document.querySelector('#score');
const bestScoreElement = document.querySelector('#best-score');
const statusElement = document.querySelector('#game-status');
const newGameButton = document.querySelector('#new-game');

const boardSize = 4;
const target = 2048;
const bestKey = '2048-best-score';

let board = [];
let score = 0;
let bestScore = Math.max(0, Number(localStorage.getItem(bestKey)) || 0);
let won = false;
let gameOver = false;

function createEmptyBoard() {
  return Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
}

function spawnTile() {
  const emptyCells = [];
  for (let row = 0; row < boardSize; row += 1) {
    for (let column = 0; column < boardSize; column += 1) {
      if (board[row][column] === 0) emptyCells.push({ row, column });
    }
  }
  if (!emptyCells.length) return false;

  const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  board[cell.row][cell.column] = Math.random() < 0.9 ? 2 : 4;
  return true;
}

function render() {
  boardElement.replaceChildren();
  board.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('role', 'gridcell');
    tile.setAttribute('aria-label', value ? String(value) : 'Vide');
    tile.textContent = value ? String(value) : '';
    if (value) tile.dataset.value = String(value);
    tile.dataset.row = String(rowIndex);
    tile.dataset.column = String(columnIndex);
    boardElement.append(tile);
  }));
  scoreElement.textContent = String(score);
  bestScoreElement.textContent = String(bestScore);
}

function resetGame() {
  board = createEmptyBoard();
  score = 0;
  won = false;
  gameOver = false;
  spawnTile();
  spawnTile();
  statusElement.textContent = 'Fusionne les tuiles pour atteindre 2048.';
  render();
}

function readLine(direction, index) {
  return Array.from({ length: boardSize }, (_, offset) => {
    if (direction === 'left') return board[index][offset];
    if (direction === 'right') return board[index][boardSize - 1 - offset];
    if (direction === 'up') return board[offset][index];
    return board[boardSize - 1 - offset][index];
  });
}

function writeLine(direction, index, line) {
  line.forEach((value, offset) => {
    if (direction === 'left') board[index][offset] = value;
    else if (direction === 'right') board[index][boardSize - 1 - offset] = value;
    else if (direction === 'up') board[offset][index] = value;
    else board[boardSize - 1 - offset][index] = value;
  });
}

function mergeLine(line) {
  const packed = line.filter(Boolean);
  const merged = [];

  for (let index = 0; index < packed.length; index += 1) {
    if (packed[index] === packed[index + 1]) {
      const value = packed[index] * 2;
      merged.push(value);
      score += value;
      index += 1;
    } else {
      merged.push(packed[index]);
    }
  }

  return [...merged, ...Array(boardSize - merged.length).fill(0)];
}

function canMove() {
  for (let row = 0; row < boardSize; row += 1) {
    for (let column = 0; column < boardSize; column += 1) {
      if (board[row][column] === 0) return true;
      if (column < boardSize - 1 && board[row][column] === board[row][column + 1]) return true;
      if (row < boardSize - 1 && board[row][column] === board[row + 1][column]) return true;
    }
  }
  return false;
}

function move(direction) {
  if (gameOver || !['up', 'down', 'left', 'right'].includes(direction)) return;
  const before = JSON.stringify(board);
  for (let index = 0; index < boardSize; index += 1) {
    writeLine(direction, index, mergeLine(readLine(direction, index)));
  }

  if (JSON.stringify(board) === before) return;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(bestKey, String(bestScore));
  }
  spawnTile();
  render();

  if (!won && board.some((row) => row.includes(target))) {
    won = true;
    statusElement.textContent = '2048 ! Bien joué — tu peux continuer à jouer.';
  } else if (!canMove()) {
    gameOver = true;
    statusElement.textContent = `Plus de mouvement. Score final : ${score}.`;
  } else if (won) {
    statusElement.textContent = 'Tu as dépassé 2048. Continue à fusionner !';
  }
}

const keyDirections = {
  arrowup: 'up', w: 'up', z: 'up',
  arrowdown: 'down', s: 'down',
  arrowleft: 'left', a: 'left', q: 'left',
  arrowright: 'right', d: 'right',
};

document.addEventListener('keydown', (event) => {
  const direction = keyDirections[event.key.toLowerCase()];
  if (!direction) return;
  event.preventDefault();
  move(direction);
});

document.querySelectorAll('[data-direction]').forEach((button) => {
  button.addEventListener('click', () => move(button.dataset.direction));
});

let pointerStart = null;
boardElement.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' || !event.isPrimary) return;
  pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  boardElement.setPointerCapture(event.pointerId);
});

boardElement.addEventListener('pointerup', (event) => {
  if (!pointerStart || pointerStart.id !== event.pointerId) return;
  const deltaX = event.clientX - pointerStart.x;
  const deltaY = event.clientY - pointerStart.y;
  pointerStart = null;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return;
  move(Math.abs(deltaX) > Math.abs(deltaY)
    ? deltaX > 0 ? 'right' : 'left'
    : deltaY > 0 ? 'down' : 'up');
});

boardElement.addEventListener('pointercancel', () => {
  pointerStart = null;
});

newGameButton.addEventListener('click', resetGame);
resetGame();
