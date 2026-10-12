const canvas = document.querySelector('#pong-canvas');
const context = canvas.getContext('2d');
const setupPanel = document.querySelector('#local-setup-panel');
const gameplayPanel = document.querySelector('#gameplay-panel');
const status = document.querySelector('#game-status');
const newRoundButton = document.querySelector('#new-round');
const leaderboard = document.querySelector('#match-leaderboard');
const targetScore = 5;
const court = { width: 960, height: 540, paddleWidth: 16, paddleHeight: 108, ballRadius: 11 };
const paddles = { X: { y: 216, direction: 0 }, O: { y: 216, direction: 0 } };
const scores = { X: 0, O: 0 };
const players = { X: 'Joueur 1', O: 'Joueur 2' };
const keys = new Set();

let ball = { x: 480, y: 270, vx: 0, vy: 0 };
let running = false;
let finished = false;
let serveTimer = 0;
let animationFrame = 0;
let previousFrame = 0;
let lastTouchTime = 0;

function renderStats(stats) {
  document.querySelector('#games-completed').textContent = String(stats.gamesCompleted || 0);
  document.querySelector('#draw-count').textContent = String(stats.draws || 0);
  leaderboard.replaceChildren();

  if (!stats.players.length) {
    const emptyMessage = document.createElement('li');
    emptyMessage.textContent = 'Les résultats apparaîtront après la première partie.';
    leaderboard.append(emptyMessage);
    return;
  }

  stats.players.slice(0, 5).forEach((player) => {
    const row = document.createElement('li');
    const name = document.createElement('strong');
    const score = document.createElement('span');
    name.textContent = player.name;
    score.textContent = `${player.wins} V · ${player.draws} N · ${player.losses} D (${player.games})`;
    row.append(name, score);
    leaderboard.append(row);
  });
}

function updateScoreboard() {
  document.querySelector('#score-x').textContent = String(scores.X);
  document.querySelector('#score-o').textContent = String(scores.O);
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  canvas.width = Math.round(bounds.width * ratio);
  canvas.height = Math.round(bounds.height * ratio);
  drawCourt();
}

function drawCourt() {
  context.setTransform(canvas.width / court.width, 0, 0, canvas.height / court.height, 0, 0);
  context.clearRect(0, 0, court.width, court.height);
  context.fillStyle = '#101815';
  context.fillRect(0, 0, court.width, court.height);
  context.setLineDash([12, 16]);
  context.strokeStyle = '#f3f1e833';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(court.width / 2, 0);
  context.lineTo(court.width / 2, court.height);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = '#d7f36a';
  context.fillRect(34, paddles.X.y, court.paddleWidth, court.paddleHeight);
  context.fillStyle = '#ff8069';
  context.fillRect(court.width - 34 - court.paddleWidth, paddles.O.y, court.paddleWidth, court.paddleHeight);

  context.beginPath();
  context.arc(ball.x, ball.y, court.ballRadius, 0, Math.PI * 2);
  context.fillStyle = '#f3f1e8';
  context.shadowColor = '#f3f1e877';
  context.shadowBlur = 18;
  context.fill();
  context.shadowBlur = 0;

  if (serveTimer > 0 && !finished) {
    context.fillStyle = '#f3f1e8aa';
    context.font = '20px "DM Mono", Consolas, monospace';
    context.textAlign = 'center';
    context.fillText('PRÊT ?', court.width / 2, 52);
  }
}

function launchBall(toward = Math.random() < 0.5 ? -1 : 1) {
  const angle = Math.random() * 0.7 - 0.35;
  const speed = 420;
  ball = {
    x: court.width / 2,
    y: court.height / 2,
    vx: Math.cos(angle) * speed * toward,
    vy: Math.sin(angle) * speed,
  };
}

function setStatus(message) {
  status.textContent = message;
}

function endGame(winner) {
  running = false;
  finished = true;
  paddles.X.direction = 0;
  paddles.O.direction = 0;
  keys.clear();
  document.querySelectorAll('.pong-control-player button').forEach((button) => button.classList.remove('is-held'));
  setStatus(`${players[winner]} remporte la partie !`);
  newRoundButton.hidden = false;
  window.localGameStats.record('pong', players, winner);
  drawCourt();
}

function scorePoint(player) {
  scores[player] += 1;
  updateScoreboard();
  if (scores[player] >= targetScore) {
    endGame(player);
    return;
  }

  const concededBy = player === 'X' ? 'O' : 'X';
  setStatus(`${players[player]} marque !`);
  ball.x = court.width / 2;
  ball.y = court.height / 2;
  ball.vx = 0;
  ball.vy = 0;
  serveTimer = 1.1;
  ball.serveDirection = concededBy === 'X' ? -1 : 1;
}

function reflectFromPaddle(player, paddleY) {
  const offset = (ball.y - (paddleY + court.paddleHeight / 2)) / (court.paddleHeight / 2);
  const angle = offset * Math.PI / 3;
  const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.045, 760);
  const direction = player === 'X' ? 1 : -1;
  ball.vx = Math.cos(angle) * speed * direction;
  ball.vy = Math.sin(angle) * speed;
}

function updateGame(delta) {
  const speed = 430;
  const paddleLimit = court.height - court.paddleHeight;

  for (const player of ['X', 'O']) {
    const keyboardDirection = player === 'X'
      ? Number(keys.has('s')) - Number(keys.has('w'))
      : Number(keys.has('arrowdown')) - Number(keys.has('arrowup'));
    const direction = paddles[player].direction || keyboardDirection;
    paddles[player].y = Math.max(0, Math.min(paddleLimit, paddles[player].y + direction * speed * delta));
  }

  if (serveTimer > 0) {
    serveTimer -= delta;
    if (serveTimer <= 0 && !finished) launchBall(ball.serveDirection);
    return;
  }

  ball.x += ball.vx * delta;
  ball.y += ball.vy * delta;

  if ((ball.y - court.ballRadius <= 0 && ball.vy < 0)
    || (ball.y + court.ballRadius >= court.height && ball.vy > 0)) {
    ball.vy *= -1;
  }

  const leftPaddle = { x: 34, y: paddles.X.y };
  const rightPaddle = { x: court.width - 34 - court.paddleWidth, y: paddles.O.y };

  if (ball.vx < 0 && ball.x - court.ballRadius <= leftPaddle.x + court.paddleWidth
    && ball.x > leftPaddle.x
    && ball.y >= leftPaddle.y - court.ballRadius
    && ball.y <= leftPaddle.y + court.paddleHeight + court.ballRadius) {
    reflectFromPaddle('X', leftPaddle.y);
  } else if (ball.vx > 0 && ball.x + court.ballRadius >= rightPaddle.x
    && ball.x < rightPaddle.x + court.paddleWidth
    && ball.y >= rightPaddle.y - court.ballRadius
    && ball.y <= rightPaddle.y + court.paddleHeight + court.ballRadius) {
    reflectFromPaddle('O', rightPaddle.y);
  }

  if (ball.x < -court.ballRadius) scorePoint('O');
  else if (ball.x > court.width + court.ballRadius) scorePoint('X');
}

function frame(timestamp) {
  if (!running) return;
  const delta = Math.min((timestamp - previousFrame) / 1000 || 0, 0.03);
  previousFrame = timestamp;
  updateGame(delta);
  drawCourt();
  animationFrame = window.requestAnimationFrame(frame);
}

function startRound() {
  scores.X = 0;
  scores.O = 0;
  paddles.X.y = court.height / 2 - court.paddleHeight / 2;
  paddles.O.y = court.height / 2 - court.paddleHeight / 2;
  paddles.X.direction = 0;
  paddles.O.direction = 0;
  keys.clear();
  finished = false;
  running = true;
  serveTimer = 1;
  ball = { x: court.width / 2, y: court.height / 2, vx: 0, vy: 0 };
  updateScoreboard();
  setStatus('Premier à 5 points');
  newRoundButton.hidden = true;
  setupPanel.hidden = true;
  gameplayPanel.hidden = false;
  previousFrame = performance.now();
  window.cancelAnimationFrame(animationFrame);
  animationFrame = window.requestAnimationFrame(frame);
  resizeCanvas();
}

function getControlButton(event) {
  const button = event.target.closest('[data-player][data-direction]');
  return button && gameplayPanel.contains(button) ? button : null;
}

document.querySelector('#start-local-game').addEventListener('click', () => {
  players.X = document.querySelector('#local-player-x').value.trim().slice(0, 18) || 'Joueur 1';
  players.O = document.querySelector('#local-player-o').value.trim().slice(0, 18) || 'Joueur 2';
  document.querySelector('#name-x').textContent = players.X.toLocaleUpperCase('fr');
  document.querySelector('#name-o').textContent = players.O.toLocaleUpperCase('fr');
  document.querySelector('#control-name-x').textContent = players.X;
  document.querySelector('#control-name-o').textContent = players.O;
  startRound();
});

newRoundButton.addEventListener('click', startRound);
document.querySelector('#change-players').addEventListener('click', () => {
  running = false;
  finished = false;
  window.cancelAnimationFrame(animationFrame);
  keys.clear();
  paddles.X.direction = 0;
  paddles.O.direction = 0;
  gameplayPanel.hidden = true;
  setupPanel.hidden = false;
});

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (!['w', 's', 'arrowup', 'arrowdown'].includes(key)) return;
  if (document.activeElement instanceof HTMLInputElement) return;
  if (!gameplayPanel.hidden) {
    event.preventDefault();
    keys.add(key);
  }
});

document.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => {
  keys.clear();
  paddles.X.direction = 0;
  paddles.O.direction = 0;
  document.querySelectorAll('.pong-control-player button').forEach((button) => button.classList.remove('is-held'));
});

document.querySelector('.pong-controls').addEventListener('pointerdown', (event) => {
  const button = getControlButton(event);
  if (!button || !running) return;
  event.preventDefault();
  if (event.pointerType === 'touch') lastTouchTime = Date.now();
  button.setPointerCapture(event.pointerId);
  button.classList.add('is-held');
  paddles[button.dataset.player].direction = Number(button.dataset.direction);
});

function releaseControl(event) {
  const button = getControlButton(event);
  if (!button) return;
  button.classList.remove('is-held');
  const player = button.dataset.player;
  if (player && !document.querySelector(`.pong-control-player button.is-held[data-player="${player}"]`)) {
    paddles[player].direction = 0;
  }
}

document.querySelector('.pong-controls').addEventListener('pointerup', releaseControl);
document.querySelector('.pong-controls').addEventListener('pointercancel', releaseControl);
document.querySelector('.pong-controls').addEventListener('lostpointercapture', releaseControl);
document.querySelector('.pong-controls').addEventListener('click', (event) => {
  if (Date.now() - lastTouchTime < 800) return;
  const button = getControlButton(event);
  if (!button || !running) return;
  const paddle = paddles[button.dataset.player];
  paddle.y = Math.max(0, Math.min(court.height - court.paddleHeight,
    paddle.y + Number(button.dataset.direction) * 42));
  drawCourt();
});

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => window.setTimeout(resizeCanvas, 100));
window.addEventListener('local-game-stats-updated', (event) => renderStats(event.detail));
window.addEventListener('storage', (event) => {
  if (event.key === 'jeux-de-poche-local-stats') renderStats(window.localGameStats.snapshot());
});

renderStats(window.localGameStats.snapshot());
resizeCanvas();
