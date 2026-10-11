(function initializeLocalStats() {
  const storageKey = 'jeux-de-poche-local-stats';

  function emptyStats() {
    return { gamesCompleted: 0, draws: 0, players: {}, byGame: {} };
  }

  function readStats() {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return emptyStats();

    try {
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object') return emptyStats();
      return {
        gamesCompleted: Number(parsed.gamesCompleted) || 0,
        draws: Number(parsed.draws) || 0,
        players: parsed.players && typeof parsed.players === 'object' ? parsed.players : {},
        byGame: parsed.byGame && typeof parsed.byGame === 'object' ? parsed.byGame : {},
      };
    } catch (error) {
      console.error('Impossible de lire les scores locaux :', error);
      return emptyStats();
    }
  }

  function snapshot() {
    const stats = readStats();
    const players = Object.entries(stats.players)
      .map(([name, score]) => ({ name, ...score }))
      .sort((first, second) => second.wins - first.wins
        || second.games - first.games
        || first.name.localeCompare(second.name, 'fr'));
    return { ...stats, players };
  }

  function record(gameId, players, winner) {
    if (!gameId || !players?.X || !players?.O || ![null, 'X', 'O'].includes(winner)) {
      throw new Error('Résultat de partie invalide.');
    }

    const stats = readStats();
    stats.gamesCompleted += 1;
    if (winner === null) stats.draws += 1;
    if (!stats.byGame[gameId]) stats.byGame[gameId] = { gamesCompleted: 0, draws: 0 };
    stats.byGame[gameId].gamesCompleted += 1;
    if (winner === null) stats.byGame[gameId].draws += 1;

    for (const mark of ['X', 'O']) {
      const name = String(players[mark]).trim().slice(0, 18) || `Joueur ${mark}`;
      if (!stats.players[name]) stats.players[name] = { games: 0, wins: 0, draws: 0, losses: 0 };
      const result = winner === null ? 'draws' : winner === mark ? 'wins' : 'losses';
      stats.players[name].games += 1;
      stats.players[name][result] += 1;
    }

    localStorage.setItem(storageKey, JSON.stringify(stats));
    window.dispatchEvent(new CustomEvent('local-game-stats-updated', { detail: snapshot() }));
  }

  window.localGameStats = { snapshot, record };
})();
