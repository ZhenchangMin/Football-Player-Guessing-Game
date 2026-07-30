const playerKey = (player) =>
  String(player?.name ?? "")
    .trim()
    .toLowerCase();

export const createPlayerMap = (players = []) => {
  const playerMap = new Map();

  for (const player of players) {
    const key = playerKey(player);
    if (key) playerMap.set(key, player);
  }

  return playerMap;
};

export const upsertPlayer = (playerMap, player) => {
  const key = playerKey(player);
  if (!key) return false;

  playerMap.set(key, player);
  return true;
};

export const mergePlayers = (existingPlayers = [], fetchedPlayers = []) => {
  const playerMap = createPlayerMap(existingPlayers);

  for (const player of fetchedPlayers) {
    upsertPlayer(playerMap, player);
  }

  return Array.from(playerMap.values());
};
