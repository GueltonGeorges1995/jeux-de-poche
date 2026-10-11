const modeButtons = [...document.querySelectorAll('[data-mode-option]')];
const gameCards = [...document.querySelectorAll('[data-game-mode]')];
const gameGrid = document.querySelector('#game-grid');
const modeTitle = document.querySelector('#catalog-title');
const modeDescription = document.querySelector('#mode-description');
const availableCount = document.querySelector('#available-count');
const availableLabel = document.querySelector('#available-label');
const gamesPlayed = document.querySelector('#games-played');
const drawGames = document.querySelector('#draw-games');
const leaderboard = document.querySelector('#leaderboard');

function setMode(mode) {
  const selectedMode = mode === 'solo' ? 'solo' : 'duo';
  document.body.classList.toggle('solo-mode', selectedMode === 'solo');
  gameGrid.classList.toggle('mode-solo', selectedMode === 'solo');
  gameGrid.classList.toggle('mode-duo', selectedMode === 'duo');
  modeButtons.forEach((button) => {
    const selected = button.dataset.modeOption === selectedMode;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  const visibleCards = gameCards.filter((card) => card.dataset.gameMode === selectedMode);
  visibleCards.forEach((card) => { card.hidden = false; });
  gameCards.filter((card) => card.dataset.gameMode !== selectedMode).forEach((card) => { card.hidden = true; });

  const readyCount = visibleCards.filter((card) => card.dataset.available === 'true').length;
  availableCount.textContent = String(readyCount).padStart(2, '0');
  availableLabel.innerHTML = readyCount
    ? selectedMode === 'solo' ? 'JEUX SOLO<br>DISPONIBLES' : 'JEUX DUO<br>DISPONIBLES'
    : selectedMode === 'solo' ? 'JEU SOLO<br>BIENTÔT' : 'JEU DUO<br>BIENTÔT';
  modeTitle.textContent = selectedMode === 'solo' ? 'Jeux en solo' : 'Jeux en duo';
  modeDescription.textContent = selectedMode === 'solo'
    ? 'Choisis une partie et joue à ton rythme.'
    : 'Jouez à deux sur le même écran.';
  localStorage.setItem('jeux-de-poche-mode', selectedMode);
}

function renderStats(stats) {
  gamesPlayed.textContent = String(stats.gamesCompleted || 0);
  drawGames.textContent = String(stats.draws || 0);
  leaderboard.replaceChildren();

  if (!stats.players?.length) {
    const emptyMessage = document.createElement('li');
    emptyMessage.className = 'empty-score';
    emptyMessage.textContent = 'Les premiers scores apparaîtront après une partie à deux.';
    leaderboard.append(emptyMessage);
    return;
  }

  stats.players.slice(0, 5).forEach((player, index) => {
    const row = document.createElement('li');
    const name = document.createElement('strong');
    const score = document.createElement('span');
    name.textContent = `${String(index + 1).padStart(2, '0')}  ${player.name}`;
    score.textContent = `${player.wins} V · ${player.draws} N · ${player.losses} D`;
    row.append(name, score);
    leaderboard.append(row);
  });
}

modeButtons.forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.modeOption));
});

window.addEventListener('local-game-stats-updated', (event) => renderStats(event.detail));
window.addEventListener('storage', (event) => {
  if (event.key === 'jeux-de-poche-local-stats') renderStats(window.localGameStats.snapshot());
});

setMode(localStorage.getItem('jeux-de-poche-mode'));
renderStats(window.localGameStats.snapshot());
