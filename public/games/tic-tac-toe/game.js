const cells = [...document.querySelectorAll('[data-cell]')];
const setupPanel = document.querySelector('#local-setup-panel');
const gameplayPanel = document.querySelector('#gameplay-panel');
const status = document.querySelector('#game-status');
const newRoundButton = document.querySelector('#new-round');
const leaderboard = document.querySelector('#match-leaderboard');

const winningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

let board = Array(9).fill('');
let currentMark = 'X';
let round = 0;
let players = { X: 'Joueur 1', O: 'Joueur 2' };
let winningLine = [];
let gameOver = false;

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

function renderGame() {
  document.querySelector('#round-number').textContent = String(round).padStart(2, '0');
  document.querySelector('#name-x').textContent = players.X;
  document.querySelector('#name-o').textContent = players.O;

  cells.forEach((cell, index) => {
    const mark = board[index];
    cell.textContent = mark;
    cell.disabled = gameOver || Boolean(mark);
    cell.setAttribute('aria-label', `Case ${index + 1}, ${mark || 'vide'}`);
    if (mark) cell.dataset.mark = mark;
    else delete cell.dataset.mark;
    cell.classList.toggle('is-winning', winningLine.includes(index));
  });

  document.querySelectorAll('[data-player]').forEach((player) => {
    player.classList.toggle('is-active', !gameOver && player.dataset.player === currentMark);
  });

  status.textContent = gameOver
    ? winningLine.length
      ? `${players[currentMark]} remporte la partie !`
      : 'Match nul !'
    : `Au tour de ${players[currentMark]}`;
  newRoundButton.hidden = !gameOver;
}

function startRound() {
  board = Array(9).fill('');
  currentMark = 'X';
  winningLine = [];
  gameOver = false;
  round += 1;
  setupPanel.hidden = true;
  gameplayPanel.hidden = false;
  renderGame();
}

function finishRound(winner) {
  gameOver = true;
  window.localGameStats.record('tic-tac-toe', players, winner);
  renderGame();
  renderStats(window.localGameStats.snapshot());
}

function playCell(index) {
  if (gameOver || board[index]) return;

  board[index] = currentMark;
  winningLine = winningLines.find((line) => line.every((position) => board[position] === currentMark)) || [];

  if (winningLine.length) {
    finishRound(currentMark);
    return;
  }

  if (board.every(Boolean)) {
    finishRound(null);
    return;
  }

  currentMark = currentMark === 'X' ? 'O' : 'X';
  renderGame();
}

document.querySelector('#start-local-game').addEventListener('click', () => {
  players = {
    X: document.querySelector('#local-player-x').value.trim().slice(0, 18) || 'Joueur 1',
    O: document.querySelector('#local-player-o').value.trim().slice(0, 18) || 'Joueur 2',
  };
  startRound();
});

cells.forEach((cell) => {
  cell.addEventListener('click', () => playCell(Number(cell.dataset.cell)));
});

newRoundButton.addEventListener('click', startRound);
document.querySelector('#change-players').addEventListener('click', () => {
  gameplayPanel.hidden = true;
  setupPanel.hidden = false;
});

window.addEventListener('local-game-stats-updated', (event) => renderStats(event.detail));
window.addEventListener('storage', (event) => {
  if (event.key === 'jeux-de-poche-local-stats') renderStats(window.localGameStats.snapshot());
});
renderStats(window.localGameStats.snapshot());
