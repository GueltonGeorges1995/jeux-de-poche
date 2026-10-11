const board = document.querySelector('#memory-board');
const moveCountEl = document.querySelector('#move-count');
const timerEl = document.querySelector('#timer');
const pairCountEl = document.querySelector('#pair-count');
const bestScoreEl = document.querySelector('#best-score');
const bestTimeEl = document.querySelector('#best-time');
const gameStatusEl = document.querySelector('#game-status');
const newGameButton = document.querySelector('#new-game');
const soundToggleButton = document.querySelector('#sound-toggle');

const symbols = ['🍋', '🍉', '🍇', '🍓', '🍒', '🍍', '🍊', '🍏'];
const totalPairs = symbols.length;
const bestKey = 'memory-best-score';
const soundKey = 'memory-sound-enabled';

let cards = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedPairs = 0;
let moves = 0;
let seconds = 0;
let timerId = null;
let mismatchTimeoutId = null;
let hasStarted = false;
let soundEnabled = localStorage.getItem(soundKey) !== 'false';
let audioContext = null;

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function formatTime(value) {
  const minutes = String(Math.floor(value / 60)).padStart(2, '0');
  const secs = String(value % 60).padStart(2, '0');
  return `${minutes}:${secs}`;
}

function readBestScore() {
  const saved = JSON.parse(localStorage.getItem(bestKey) || 'null');
  if (!saved || !Number.isInteger(saved.moves) || !Number.isInteger(saved.seconds)) return null;
  return saved;
}

function updateBestScore() {
  const best = readBestScore();
  bestScoreEl.textContent = best ? `${best.moves} coups` : '—';
  bestTimeEl.textContent = best ? `en ${formatTime(best.seconds)}` : 'À établir';
}

function updateStats() {
  moveCountEl.textContent = String(moves);
  timerEl.textContent = formatTime(seconds);
  pairCountEl.textContent = `${matchedPairs}/${totalPairs}`;
}

function updateSoundButton() {
  soundToggleButton.textContent = soundEnabled ? 'Son activé' : 'Son coupé';
  soundToggleButton.setAttribute('aria-pressed', String(soundEnabled));
  soundToggleButton.setAttribute('aria-label', soundEnabled ? 'Couper les effets sonores' : 'Activer les effets sonores');
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function startTimer() {
  if (timerId) return;
  timerId = setInterval(() => {
    seconds += 1;
    updateStats();
  }, 1000);
}

function showStatus(message) {
  gameStatusEl.textContent = message;
}

function playSound(kind) {
  if (!soundEnabled || typeof window.AudioContext !== 'function') return;

  audioContext ||= new window.AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume();

  const presets = {
    flip: { frequency: 520, duration: 0.07, wave: 'sine' },
    match: { frequency: 740, duration: 0.16, wave: 'sine' },
    miss: { frequency: 220, duration: 0.18, wave: 'triangle' },
    win: { frequency: 880, duration: 0.32, wave: 'sine' },
  };
  const { frequency, duration, wave } = presets[kind];
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (kind === 'flip') oscillator.frequency.exponentialRampToValueAtTime(760, now + duration);
  if (kind === 'match' || kind === 'win') oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.25, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.1, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function createDeck() {
  if (mismatchTimeoutId) {
    clearTimeout(mismatchTimeoutId);
    mismatchTimeoutId = null;
  }

  cards = shuffle([...symbols, ...symbols]).map((symbol) => ({
    symbol,
    revealed: false,
    matched: false,
  }));

  firstCard = null;
  secondCard = null;
  lockBoard = false;
  matchedPairs = 0;
  moves = 0;
  seconds = 0;
  hasStarted = false;
  stopTimer();
  updateStats();
  updateBestScore();
  showStatus('Clique sur une carte pour commencer.');
  renderBoard();
}

function renderBoard() {
  board.replaceChildren();

  cards.forEach((card, index) => {
    const button = document.createElement('button');
    const back = document.createElement('span');
    const front = document.createElement('span');
    const visible = card.revealed || card.matched;

    button.type = 'button';
    button.className = 'memory-card';
    button.disabled = card.matched || lockBoard;
    button.classList.toggle('is-flipped', card.revealed && !card.matched);
    button.classList.toggle('is-matched', card.matched);
    button.setAttribute('aria-label', visible ? `Carte ${card.symbol}` : 'Carte cachée');

    back.className = 'card-face card-back';
    back.setAttribute('aria-hidden', 'true');
    back.textContent = '?';
    front.className = 'card-face card-front';
    front.setAttribute('aria-hidden', 'true');
    front.textContent = card.symbol;

    button.append(back, front);
    button.addEventListener('click', () => handleCardClick(index));
    board.append(button);
  });
}

function finishGame() {
  stopTimer();
  const current = { moves, seconds };
  const previous = readBestScore();

  if (!previous || current.moves < previous.moves || (current.moves === previous.moves && current.seconds < previous.seconds)) {
    localStorage.setItem(bestKey, JSON.stringify(current));
  }

  updateBestScore();
  playSound('win');
  const best = readBestScore();
  showStatus(`Partie gagnée ! Meilleur score : ${best.moves} coups en ${formatTime(best.seconds)}.`);
}

function resetTurn() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  renderBoard();
}

function resolveTurn() {
  mismatchTimeoutId = null;
  if (firstCard === null || secondCard === null) return;

  const firstSymbol = cards[firstCard].symbol;
  const secondSymbol = cards[secondCard].symbol;

  if (firstSymbol === secondSymbol) {
    cards[firstCard].matched = true;
    cards[secondCard].matched = true;
    matchedPairs += 1;
    showStatus('Bonne paire !');
    playSound('match');
    updateStats();
    resetTurn();

    if (matchedPairs === totalPairs) finishGame();
    return;
  }

  showStatus('Raté, essaie encore !');
  playSound('miss');
  mismatchTimeoutId = setTimeout(() => {
    if (firstCard !== null && secondCard !== null) {
      cards[firstCard].revealed = false;
      cards[secondCard].revealed = false;
      resetTurn();
    }
    mismatchTimeoutId = null;
  }, 700);
}

function handleCardClick(index) {
  const selectedCard = cards[index];

  if (!selectedCard || selectedCard.revealed || selectedCard.matched || lockBoard) return;

  if (!hasStarted) {
    hasStarted = true;
    startTimer();
  }

  selectedCard.revealed = true;
  playSound('flip');

  if (firstCard === null) {
    firstCard = index;
    renderBoard();
    showStatus('Choisis une autre carte.');
    return;
  }

  if (secondCard === null && index !== firstCard) {
    secondCard = index;
    moves += 1;
    updateStats();
    lockBoard = true;
    renderBoard();
    setTimeout(resolveTurn, 220);
  }
}

soundToggleButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem(soundKey, String(soundEnabled));
  updateSoundButton();
  if (soundEnabled) playSound('flip');
});

newGameButton.addEventListener('click', createDeck);
updateSoundButton();
createDeck();
