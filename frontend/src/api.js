// Thin wrapper around fetch() for the four backend services.
// All calls go through /api/<service>/... which Nginx (in prod) or
// the Vite dev proxy (in local dev) routes to the right microservice.
// This means the React app never needs to know real service hostnames.

const BASE = {
  player: "/api/player",
  match: "/api/match",
  game: "/api/game",
  stats: "/api/stats",
};

async function request(base, path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body;
}

export const api = {
  // --- Player service ---
  createOrJoinPlayer: (username) =>
    request(BASE.player, "/players", { method: "POST", body: JSON.stringify({ username }) }),

  // --- Match service ---
  joinQueue: (playerId, username) =>
    request(BASE.match, "/queue", { method: "POST", body: JSON.stringify({ player_id: playerId, username }) }),
  queueStatus: (playerId) => request(BASE.match, `/queue/status/${playerId}`),
  leaveQueue: (playerId) =>
    request(BASE.match, "/queue/leave", { method: "POST", body: JSON.stringify({ player_id: playerId }) }),

  // --- Game service ---
  getGame: (gameId) => request(BASE.game, `/games/${gameId}`),
  makeMove: (gameId, playerId, position) =>
    request(BASE.game, `/games/${gameId}/move`, {
      method: "POST",
      body: JSON.stringify({ player_id: playerId, position }),
    }),

  // --- Stats service ---
  recordResult: (payload) =>
    request(BASE.stats, "/stats/result", { method: "POST", body: JSON.stringify(payload) }),
  leaderboard: () => request(BASE.stats, "/stats/leaderboard"),
};
