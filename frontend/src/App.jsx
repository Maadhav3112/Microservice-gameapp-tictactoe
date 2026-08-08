import { useState } from "react";
import Lobby from "./components/Lobby.jsx";
import Board from "./components/Board.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import { api } from "./api.js";

export default function App() {
  const [player, setPlayer] = useState(null);
  const [match, setMatch] = useState(null);
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  const handleMatched = (createdPlayer, matchInfo) => {
    setPlayer(createdPlayer);
    setMatch(matchInfo);
  };

  const handleGameOver = () => {
    // Bump the key so <Leaderboard> refetches after a game finishes.
    setLeaderboardKey((k) => k + 1);
  };

  const handlePlayAgain = () => {
    // Tell the backend we're done with this match too, not just the UI —
    // otherwise match-service keeps handing this player_id the same old
    // match forever the next time they try to queue up.
    if (player) {
      api.leaveQueue(player.id).catch(() => {
        // Best-effort: even if this fails, still let the player go back
        // to the lobby locally rather than getting stuck.
      });
    }
    setMatch(null);
  };

  const mySymbol =
    match && player ? (match.players[0].player_id === player.id ? "X" : "O") : null;
  const opponent =
    match && player ? match.players.find((p) => p.player_id !== player.id) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6">
      {!match ? (
        <Lobby onMatched={handleMatched} />
      ) : (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-6">
          <Board
            gameId={match.game_id}
            playerId={player.id}
            mySymbol={mySymbol}
            opponentName={opponent?.username || "opponent"}
            onGameOver={handleGameOver}
          />
          <button
            onClick={handlePlayAgain}
            className="text-sm text-slate-500 underline hover:text-slate-700"
          >
            Back to lobby
          </button>
        </div>
      )}

      <Leaderboard refreshKey={leaderboardKey} />
    </div>
  );
}