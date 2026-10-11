const boardElement = document.querySelector('#connect-four-board');
const setupPanel = document.querySelector('#local-setup-panel');
const gameplayPanel = document.querySelector('#gameplay-panel');
const status = document.querySelector('#game-status');
const newRoundButton = document.querySelector('#new-round');
const leaderboard = document.querySelector('#match-leaderboard');

const rows = 6;
const columns = 7;
const lineDirections = [[0, 1], [1, 0], [1, 1], [1, -1]];

let board = [];
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

function indexOf(row, column) {
  return row * columns + column;
}

function findWinningLine(row, column, mark) {
  for (const [rowStep, columnStep] of lineDirections) {
    const line = [indexOf(row, column)];
    for (const sign of [-1, 1]) {
      let targetRow = row + rowStep * sign;
      let targetColumn = column + columnStep * sign;
      while (targetRow >= 0 && targetRow < rows
        && targetColumn >= 0 && targetColumn < columns
        && board[indexOf(targetRow, targetColumn)] === mark) {
        line.push(indexOf(targetRow, targetColumn));
        targetRow += rowStep * sign;
        targetColumn += columnStep * sign;
      }
    }
    if (line.length >= 4) return line;
  }
  return [];
}

function renderGame() {
  document.querySelector('#round-number').textContent = String(round).padStart(2, '0');
  document.querySelector('#name-x').textContent = players.X;
  document.querySelector('#name-o').textContent = players.O;
  boardElement.replaceChildren();
  const landingRows = Array(columns).fill(-1);
  for (let column = 0; column < columns; column += 1) {
    for (let row = rows - 1; row >= 0; row -= 1) {
      if (board[indexOf(row, column)] === '') {
        landingRows[column] = row;
        break;
      }
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = indexOf(row, column);
      const mark = board[index];
      const playable = !gameOver && row === landingRows[column];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'connect-four-cell';
      button.dataset.row = String(row);
      button.dataset.column = String(column);
      if (mark) button.dataset.mark = mark;
      button.classList.toggle('is-winning', winningLine.includes(index));
      button.disabled = !playable || Boolean(mark);
      button.setAttribute('aria-label', `Colonne ${column + 1}, ligne ${row + 1}, ${mark || 'vide'}`);
      button.addEventListener('click', () => playColumn(column));
      boardElement.append(button);
    }
  }

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
  board = Array(rows * columns).fill('');
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
  window.localGameStats.record('connect-four', players, winner);
  renderGame();
  renderStats(window.localGameStats.snapshot());
}

function playColumn(column) {
  if (gameOver || column < 0 || column >= columns) return;
  let targetRow = rows - 1;
  while (targetRow >= 0 && board[indexOf(targetRow, column)] !== '') targetRow -= 1;
  if (targetRow < 0) return;

  board[indexOf(targetRow, column)] = currentMark;
  winningLine = findWinningLine(targetRow, column, currentMark);
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
