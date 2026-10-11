const boardElement = document.querySelector('#solitaire-board');
const tableauElement = document.querySelector('#tableau');
const stockButton = document.querySelector('#stock');
const wasteElement = document.querySelector('#waste');
const moveCountElement = document.querySelector('#move-count');
const timerElement = document.querySelector('#timer');
const bestScoreElement = document.querySelector('#best-score');
const statusElement = document.querySelector('#game-status');
const undoButton = document.querySelector('#undo-move');
const hintButton = document.querySelector('#hint-move');
const newGameButton = document.querySelector('#new-game');

const suits = ['♥', '♦', '♣', '♠'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const suitNames = ['cœur', 'carreau', 'trèfle', 'pique'];
const bestKey = 'solitaire-best-score';
const columnCount = 7;

let stock = [];
let waste = [];
let foundations = suits.map(() => []);
let tableau = Array.from({ length: columnCount }, () => []);
let selected = null;
let history = [];
let moveCount = 0;
let elapsedSeconds = 0;
let timerId = null;
let gameWon = false;
let hintedCards = [];
let hintedTarget = null;

function shuffle(cards) {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[randomIndex]] = [cards[randomIndex], cards[index]];
  }
  return cards;
}

function formatTime(value) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function readBestScore() {
  try {
    const score = JSON.parse(localStorage.getItem(bestKey) || 'null');
    return score && Number.isInteger(score.moves) && Number.isInteger(score.seconds) ? score : null;
  } catch (error) {
    console.error('Impossible de lire le record du Solitaire :', error);
    return null;
  }
}

function updateBestScore() {
  const best = readBestScore();
  bestScoreElement.textContent = best ? `${best.moves} coups` : '—';
}

function updateStats() {
  moveCountElement.textContent = String(moveCount);
  timerElement.textContent = formatTime(elapsedSeconds);
  undoButton.disabled = history.length === 0;
}

function startTimer() {
  if (timerId || gameWon) return;
  timerId = setInterval(() => {
    elapsedSeconds += 1;
    timerElement.textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (!timerId) return;
  clearInterval(timerId);
  timerId = null;
}

function showStatus(message) {
  statusElement.textContent = message;
}

function clearHint() {
  hintedCards = [];
  hintedTarget = null;
}

function saveHistory() {
  history.push({
    stock: stock.map((card) => ({ ...card })),
    waste: waste.map((card) => ({ ...card })),
    foundations: foundations.map((pile) => pile.map((card) => ({ ...card }))),
    tableau: tableau.map((pile) => pile.map((card) => ({ ...card }))),
    moveCount,
    gameWon,
  });
  if (history.length > 100) history.shift();
}

function cardName(card) {
  return `${ranks[card.rank]} de ${suitNames[card.suit]}`;
}

function createCardElement(card, { hidden = false, selectedCard = false, hinted = false, source = null, interactive = true } = {}) {
  const element = document.createElement(interactive ? 'button' : 'span');
  if (interactive) element.type = 'button';
  element.className = 'playing-card';
  element.classList.toggle('is-hidden', hidden);
  element.classList.toggle('is-red', card.suit === 0 || card.suit === 1);
  element.classList.toggle('is-selected', selectedCard);
  element.classList.toggle('is-hinted', hinted);
  element.setAttribute('aria-label', hidden ? 'Carte face cachée' : cardName(card));
  if (interactive && source) {
    element.dataset.sourceType = source.type;
    element.dataset.sourcePile = String(source.pile);
    element.dataset.sourceIndex = String(source.index);
  }

  if (hidden) {
    if (interactive) element.disabled = true;
    element.tabIndex = -1;
    return element;
  }

  const corner = document.createElement('span');
  corner.className = 'card-corner';
  corner.append(document.createTextNode(ranks[card.rank]));
  const smallSuit = document.createElement('small');
  smallSuit.textContent = suits[card.suit];
  corner.append(smallSuit);

  const center = document.createElement('span');
  center.className = 'card-center';
  center.setAttribute('aria-hidden', 'true');
  center.textContent = suits[card.suit];
  element.append(corner, center);
  return element;
}

function drawPileCard(target, card, source, { selectedCard = false, hinted = false, interactive = true } = {}) {
  target.replaceChildren();
  target.classList.toggle('is-empty', !card);
  if (!card) {
    target.classList.remove('is-hinted');
    target.setAttribute('aria-label', 'Pile vide');
    return;
  }
  target.classList.remove('is-empty');
  target.classList.toggle('is-hinted', hinted);
  target.setAttribute('aria-label', `Défausse : ${cardName(card)}`);
  target.append(createCardElement(card, { selectedCard, hinted, source, interactive }));
}

function render() {
  const stockTop = stock.at(-1);
  stockButton.classList.toggle('has-stock', stock.length > 0);
  stockButton.classList.toggle('is-empty', stock.length === 0);
  stockButton.setAttribute('aria-label', stock.length ? `Piocher une carte, ${stock.length} restante${stock.length === 1 ? '' : 's'}` : 'Retourner la défausse dans la pioche');
  stockButton.textContent = stock.length ? '' : '↻';
  stockButton.disabled = false;
  drawPileCard(wasteElement, waste.at(-1), { type: 'waste', pile: 0, index: waste.length - 1 }, {
    selectedCard: selected?.type === 'waste',
    hinted: hintedCards.some((item) => item.type === 'waste'),
  });

  document.querySelectorAll('[data-foundation-target]').forEach((button, index) => {
    const card = foundations[index].at(-1);
    button.dataset.foundationTarget = String(index);
    button.classList.toggle('is-hinted', hintedTarget?.type === 'foundation' && hintedTarget.pile === index);
    drawPileCard(button, card, null, {
      selectedCard: selected?.type === 'foundation' && selected.pile === index,
      interactive: false,
    });
    button.dataset.foundationTarget = String(index);
    button.setAttribute('aria-label', card ? `Fondation ${suitNames[index]} : ${cardName(card)}` : `Fondation ${suitNames[index]}, vide`);
    button.disabled = gameWon;
  });

  tableauElement.replaceChildren();
  tableau.forEach((column, pileIndex) => {
    const stack = document.createElement('div');
    stack.className = 'tableau-column';
    stack.dataset.tableauTarget = String(pileIndex);
    stack.setAttribute('aria-label', `Colonne ${pileIndex + 1}`);
    const availableWidth = (boardElement.clientWidth - (columnCount - 1) * 5) / columnCount;
    const landscapeCardWidth = window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches
      ? window.innerHeight * 0.12
      : Infinity;
    const width = Math.min(72, Math.max(30, Math.min(availableWidth, landscapeCardWidth)));
    const hiddenOffset = Math.max(13, Math.round(width * 0.23));
    const faceUpOffset = Math.max(22, Math.round(width * 0.38));
    stack.style.minHeight = `${Math.max(width * 1.4, width * 1.4 + column.slice(0, -1).reduce((height, card) => height + (card.faceUp ? faceUpOffset : hiddenOffset), 0))}px`;

    column.forEach((card, cardIndex) => {
      const source = { type: 'tableau', pile: pileIndex, index: cardIndex };
      const button = createCardElement(card, {
        hidden: !card.faceUp,
        selectedCard: selected?.type === 'tableau' && selected.pile === pileIndex && cardIndex >= selected.index,
        hinted: hintedCards.some((item) => item.type === 'tableau' && item.pile === pileIndex && item.index === cardIndex),
        source,
      });
      button.style.top = `${column.slice(0, cardIndex).reduce((height, previous) => height + (previous.faceUp ? faceUpOffset : hiddenOffset), 0)}px`;
      button.style.zIndex = String(cardIndex + 1);
      if (!card.faceUp && cardIndex < column.length - 1) button.disabled = true;
      stack.append(button);
    });
    if (hintedTarget?.type === 'tableau' && hintedTarget.pile === pileIndex) stack.classList.add('is-target');
    tableauElement.append(stack);
  });

  moveCountElement.textContent = String(moveCount);
  timerElement.textContent = formatTime(elapsedSeconds);
  undoButton.disabled = history.length === 0;
}

function newGame() {
  stopTimer();
  const deck = shuffle(suits.flatMap((_, suit) => ranks.map((_, rank) => ({ suit, rank, faceUp: false }))));
  tableau = Array.from({ length: columnCount }, (_, pile) => (
    deck.splice(0, pile + 1).map((card, index, cards) => ({ ...card, faceUp: index === cards.length - 1 }))
  ));
  stock = deck;
  waste = [];
  foundations = suits.map(() => []);
  selected = null;
  history = [];
  moveCount = 0;
  elapsedSeconds = 0;
  gameWon = false;
  clearHint();
  showStatus('Touche la pioche pour commencer.');
  render();
}

function updateWinState() {
  if (foundations.every((pile) => pile.length === 13)) {
    gameWon = true;
    stopTimer();
    showStatus(`Bravo ! Partie terminée en ${moveCount} coups et ${formatTime(elapsedSeconds)}.`);
    const best = readBestScore();
    if (!best || moveCount < best.moves || (moveCount === best.moves && elapsedSeconds < best.seconds)) {
      try {
        localStorage.setItem(bestKey, JSON.stringify({ moves: moveCount, seconds: elapsedSeconds }));
        updateBestScore();
      } catch (error) {
        console.error('Impossible d’enregistrer le record du Solitaire :', error);
      }
    }
    render();
    return true;
  }
  return false;
}

function finishMove(message) {
  moveCount += 1;
  selected = null;
  clearHint();
  startTimer();
  showStatus(message);
  updateWinState();
  render();
}

function topCard(source) {
  if (source.type === 'waste') return waste.at(-1);
  if (source.type === 'foundation') return foundations[source.pile].at(-1);
  if (source.type === 'tableau') return tableau[source.pile][source.index];
  return null;
}

function removeSource(source) {
  if (source.type === 'waste') return waste.pop();
  if (source.type === 'foundation') return foundations[source.pile].pop();
  const column = tableau[source.pile];
  const moved = column.splice(source.index);
  if (column.length && !column.at(-1).faceUp) column.at(-1).faceUp = true;
  return moved;
}

function canPlaceOnTableau(cards, pileIndex) {
  if (!cards.length) return false;
  const targetPile = tableau[pileIndex];
  const target = targetPile.at(-1);
  if (!target) return cards[0].rank === 12;
  const movingCard = cards[0];
  const movingRed = movingCard.suit === 0 || movingCard.suit === 1;
  const targetRed = target.suit === 0 || target.suit === 1;
  return target.faceUp && target.rank === movingCard.rank + 1 && targetRed !== movingRed;
}

function moveToTableau(pileIndex) {
  if (!selected || gameWon) return false;
  if (selected.type === 'tableau' && selected.pile === pileIndex) return false;
  const sourcePile = selected.type === 'tableau' ? tableau[selected.pile] : waste;
  const cards = selected.type === 'tableau'
    ? sourcePile.slice(selected.index)
    : selected.type === 'foundation' ? [foundations[selected.pile].at(-1)] : [sourcePile.at(-1)];
  if (!cards[0] || !canPlaceOnTableau(cards, pileIndex)) {
    showStatus('Pour déplacer une carte, alterne les couleurs et pose-la sur la valeur suivante.');
    return false;
  }
  saveHistory();
  const moved = removeSource(selected);
  tableau[pileIndex].push(...(Array.isArray(moved) ? moved : [moved]));
  finishMove('Carte déplacée.');
  return true;
}

function moveToFoundation(foundationIndex) {
  if (!selected || selected.type === 'foundation' || gameWon) return;
  if (selected.type === 'tableau' && selected.index !== tableau[selected.pile].length - 1) return;
  const card = topCard(selected);
  if (!card) return;
  const foundation = foundations[foundationIndex];
  const valid = foundation.length
    ? foundation[0].suit === card.suit && foundation.at(-1).rank + 1 === card.rank
    : card.rank === 0 && card.suit === foundationIndex;
  if (!valid) {
    showStatus('Une fondation commence par un as et monte dans la même couleur.');
    return;
  }
  saveHistory();
  const removed = removeSource(selected);
  foundation.push(Array.isArray(removed) ? removed[0] : removed);
  finishMove(`${cardName(card)} placé${card.suit === 0 || card.suit === 1 ? 'e' : ''} dans la fondation.`);
}

function drawStock() {
  if (gameWon) return;
  if (!stock.length && !waste.length) {
    showStatus('La pioche et la défausse sont vides.');
    return;
  }
  saveHistory();
  selected = null;
  clearHint();
  if (stock.length) {
    const card = stock.pop();
    card.faceUp = true;
    waste.push(card);
    finishMove('Carte piochée.');
  } else if (waste.length) {
    stock = waste.reverse().map((card) => ({ ...card, faceUp: false }));
    waste = [];
    finishMove('La défausse est retournée dans la pioche.');
  }
}

function undoMove() {
  const previous = history.pop();
  if (!previous) return;
  stopTimer();
  stock = previous.stock;
  waste = previous.waste;
  foundations = previous.foundations;
  tableau = previous.tableau;
  moveCount = previous.moveCount;
  gameWon = previous.gameWon;
  selected = null;
  clearHint();
  if (!gameWon && moveCount > 0) startTimer();
  showStatus('Dernier coup annulé.');
  render();
}

function sourceOptions() {
  const options = [];
  if (waste.length) options.push({ source: { type: 'waste', pile: 0, index: waste.length - 1 }, cards: [waste.at(-1)] });
  foundations.forEach((pile, pileIndex) => {
    if (pile.length) options.push({ source: { type: 'foundation', pile: pileIndex, index: pile.length - 1 }, cards: [pile.at(-1)] });
  });
  tableau.forEach((column, pile) => {
    const index = column.findLastIndex((card) => card.faceUp);
    if (index >= 0) options.push({ source: { type: 'tableau', pile, index }, cards: column.slice(index) });
  });
  return options;
}

function showHint() {
  if (gameWon) return;
  clearHint();
  const options = sourceOptions();
  for (const option of options) {
    const card = option.cards[0];
    const foundationIndex = foundations.findIndex((pile, index) => (
      pile.length ? pile[0].suit === card.suit && pile.at(-1).rank + 1 === card.rank : card.rank === 0 && card.suit === index
    ));
    if (foundationIndex >= 0 && option.cards.length === 1) {
      hintedCards = [option.source];
      hintedTarget = { type: 'foundation', pile: foundationIndex };
      selected = option.source;
      showStatus(`Indice : place ${cardName(card)} sur la fondation ${suitNames[foundationIndex]}.`);
      render();
      return;
    }
  }

  for (const option of options) {
    if (option.source.type === 'tableau' && option.cards.length === 1 && tableau[option.source.pile].at(-1) === option.cards[0] && tableau[option.source.pile].length > 1) {
      const below = tableau[option.source.pile].at(-2);
      if (below && !below.faceUp) {
        hintedCards = [option.source];
        showStatus('Indice : déplace cette carte pour retourner la carte cachée dessous.');
        render();
        return;
      }
    }

    for (let pile = 0; pile < columnCount; pile += 1) {
      if (option.source.type === 'tableau' && option.source.pile === pile) continue;
      if (canPlaceOnTableau(option.cards, pile)) {
        hintedCards = [option.source];
        hintedTarget = { type: 'tableau', pile };
        selected = option.source;
        showStatus(`Indice : déplace ${cardName(option.cards[0])} vers la colonne ${pile + 1}.`);
        render();
        return;
      }
    }
  }

  if (stock.length || waste.length) {
    showStatus('Aucun déplacement immédiat : touche la pioche pour trouver une autre carte.');
  } else {
    showStatus('Aucun déplacement disponible. Annule un coup ou recommence une partie.');
  }
}

function handleCardSelection(button) {
  const source = {
    type: button.dataset.sourceType,
    pile: Number(button.dataset.sourcePile),
    index: Number(button.dataset.sourceIndex),
  };

  if (selected) {
    if (selected.type === source.type && selected.pile === source.pile && selected.index === source.index) {
      selected = null;
      clearHint();
      showStatus('Sélection annulée.');
      render();
      return;
    }
    if (source.type === 'tableau') {
      if (!moveToTableau(source.pile)) {
        selected = source;
        clearHint();
        const card = topCard(source);
        if (!card) {
          selected = null;
          render();
          return;
        }
        showStatus(`Carte sélectionnée : ${cardName(card)}. Touche sa destination.`);
        render();
      }
      return;
    }
    if (source.type === 'waste' || source.type === 'foundation') {
      selected = source;
      clearHint();
      showStatus(`Carte sélectionnée : ${cardName(topCard(source))}. Touche sa destination.`);
      render();
      return;
    }
  }

  if (source.type === 'tableau' && !tableau[source.pile][source.index].faceUp) {
    const column = tableau[source.pile];
    if (source.index === column.length - 1) {
      saveHistory();
      column.at(-1).faceUp = true;
      finishMove('Carte retournée.');
    }
    return;
  }

  selected = source;
  clearHint();
  showStatus(`Carte sélectionnée : ${cardName(topCard(source))}. Touche sa destination.`);
  render();
}

boardElement.addEventListener('click', (event) => {
  const sourceButton = event.target.closest('[data-source-type]');
  if (sourceButton) {
    handleCardSelection(sourceButton);
    return;
  }

  const foundationButton = event.target.closest('[data-foundation-target]');
  if (foundationButton) {
    const pile = Number(foundationButton.dataset.foundationTarget);
    if (selected) {
      moveToFoundation(pile);
    } else if (foundations[pile].length) {
      selected = { type: 'foundation', pile, index: foundations[pile].length - 1 };
      const card = topCard(selected);
      showStatus(`Carte sélectionnée : ${cardName(card)}. Touche une colonne ou sa fondation.`);
      render();
    }
    return;
  }

  const tableauTarget = event.target.closest('[data-tableau-target]');
  if (tableauTarget && selected) moveToTableau(Number(tableauTarget.dataset.tableauTarget));
});

stockButton.addEventListener('click', drawStock);
undoButton.addEventListener('click', undoMove);
hintButton.addEventListener('click', showHint);
newGameButton.addEventListener('click', newGame);
window.addEventListener('resize', render);

updateBestScore();
newGame();
