const canvas = document.querySelector('#snake-board');
const context = canvas.getContext('2d');
const scoreElement = document.querySelector('#score');
const bestScoreElement = document.querySelector('#best-score');
const statusElement = document.querySelector('#game-status');
const startButton = document.querySelector('#pause-game');
const newGameButton = document.querySelector('#new-game');

const gridSize = 20;
const boardSize = 400;
const renderScale = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = boardSize * renderScale;
canvas.height = boardSize * renderScale;
context.scale(renderScale, renderScale);
const cellSize = boardSize / gridSize;
const speedMs = 115;
const bestKey = 'snake-best-score';
const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let snake;
let direction;
let nextDirection;
let food;
let score = 0;
let bestScore = Math.max(0, Number(localStorage.getItem(bestKey)) || 0);
let state = 'ready';
let gameTimer = null;
let swipeStart = null;

function draw() {
  context.clearRect(0, 0, boardSize, boardSize);
  context.fillStyle = '#101916';
  context.fillRect(0, 0, boardSize, boardSize);

  context.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  context.lineWidth = 1;
  for (let coordinate = 0; coordinate <= gridSize; coordinate += 1) {
    const offset = coordinate * cellSize;
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset, boardSize);
    context.moveTo(0, offset);
    context.lineTo(boardSize, offset);
    context.stroke();
  }

  if (food) {
    context.fillStyle = '#ff8069';
    context.beginPath();
    context.arc((food.x + 0.5) * cellSize, (food.y + 0.5) * cellSize, cellSize * 0.32, 0, Math.PI * 2);
    context.fill();
  }

  snake.forEach((segment, index) => {
    const inset = index === 0 ? 2 : 3;
    context.fillStyle = index === 0 ? '#eff7b1' : '#d7f36a';
    context.beginPath();
    context.roundRect(segment.x * cellSize + inset, segment.y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2, 5);
    context.fill();
  });
}

function updateScore() {
  scoreElement.textContent = String(score);
  bestScoreElement.textContent = String(bestScore);
}

function placeFood() {
  const emptyCells = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      if (!snake.some((segment) => segment.x === x && segment.y === y)) emptyCells.push({ x, y });
    }
  }
  food = emptyCells.length ? emptyCells[Math.floor(Math.random() * emptyCells.length)] : null;
}

function resetGame() {
  clearInterval(gameTimer);
  gameTimer = null;
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  direction = directions.right;
  nextDirection = direction;
  score = 0;
  state = 'ready';
  placeFood();
  updateScore();
  startButton.textContent = 'Démarrer';
  statusElement.textContent = 'Appuie sur Démarrer pour jouer.';
  draw();
}

function endGame(won = false) {
  clearInterval(gameTimer);
  gameTimer = null;
  state = 'over';
  startButton.textContent = 'Rejouer';
  statusElement.textContent = won ? 'Bravo, tu as rempli tout le terrain !' : `Partie terminée : ${score} fruit${score === 1 ? '' : 's'} attrapé${score === 1 ? '' : 's'}.`;
}

function step() {
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const ateFood = food && head.x === food.x && head.y === food.y;
  const bodyToCheck = ateFood ? snake : snake.slice(0, -1);
  const hitWall = head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize;
  const hitSelf = bodyToCheck.some((segment) => segment.x === head.x && segment.y === head.y);

  if (hitWall || hitSelf) {
    endGame();
    return;
  }

  snake.unshift(head);
  if (ateFood) {
    score += 1;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(bestKey, String(bestScore));
    }
    placeFood();
    updateScore();
    if (!food) {
      draw();
      endGame(true);
      return;
    }
  } else {
    snake.pop();
  }
  draw();
}

function startGame() {
  if (state === 'running') {
    clearInterval(gameTimer);
    gameTimer = null;
    state = 'paused';
    startButton.textContent = 'Reprendre';
    statusElement.textContent = 'Partie en pause.';
    return;
  }

  if (state === 'over') resetGame();
  state = 'running';
  startButton.textContent = 'Pause';
  statusElement.textContent = 'À toi de jouer !';
  gameTimer = setInterval(step, speedMs);
}

function changeDirection(name) {
  const requested = directions[name];
  if (!requested || (requested.x === -nextDirection.x && requested.y === -nextDirection.y)) return;
  nextDirection = requested;
  if (state === 'ready') startGame();
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse') return;
  swipeStart = { x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointerup', (event) => {
  if (!swipeStart) return;
  const deltaX = event.clientX - swipeStart.x;
  const deltaY = event.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 20) return;

  changeDirection(Math.abs(deltaX) > Math.abs(deltaY)
    ? deltaX > 0 ? 'right' : 'left'
    : deltaY > 0 ? 'down' : 'up');
});

canvas.addEventListener('pointercancel', () => {
  swipeStart = null;
});

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  const keyDirections = {
    arrowup: 'up', w: 'up', z: 'up',
    arrowdown: 'down', s: 'down',
    arrowleft: 'left', a: 'left', q: 'left',
    arrowright: 'right', d: 'right',
  };
  const requested = keyDirections[key];
  if (!requested) return;
  event.preventDefault();
  changeDirection(requested);
});

document.querySelectorAll('[data-direction]').forEach((button) => {
  button.addEventListener('click', () => changeDirection(button.dataset.direction));
});

startButton.addEventListener('click', startGame);
newGameButton.addEventListener('click', resetGame);
resetGame();
