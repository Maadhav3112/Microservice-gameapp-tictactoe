import { useState } from "react";
import Lobby from "./components/Lobby.jsx";
import Board from "./components/Board.jsx";
import Leaderboard from "./components/Leaderboard.jsx";

export default function App() {
  const [players, setPlayers] = useState(null); // { x: {...}, o: {...} }
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  const handleStart = (playerX, playerO) => {
    setPlayers({ x: playerX, o: playerO });
  };

  const handleGameOver = () => {
    // Bump the key so <Leaderboard> refetches after a game finishes.
    setLeaderboardKey((k) => k + 1);
  };

  const handleBackToLobby = () => {
    setPlayers(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center gap-16 py-16 px-6">
      {!players ? (
        <Lobby onStart={handleStart} />
      ) : (
        <div className="w-full max-w-sm flex flex-col items-center gap-6">
          <Board playerX={players.x} playerO={players.o} onGameOver={handleGameOver} />
          <button
            onClick={handleBackToLobby}
            className="text-sm text-slate-400 underline hover:text-slate-200"
          >
            Back to lobby
          </button>
        </div>
      )}

      <Leaderboard refreshKey={leaderboardKey} />
    </div>
  );
}