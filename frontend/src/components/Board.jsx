import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const CELL_BASE =
  "flex items-center justify-center h-24 w-24 sm:h-28 sm:w-28 bg-white rounded-xl shadow-sm border border-slate-200 text-4xl font-bold transition-colors";

function Cell({ value, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || value !== null}
      className={`${CELL_BASE} ${
        value === null && !disabled ? "hover:bg-indigo-50 cursor-pointer" : "cursor-default"
      } ${value === "X" ? "text-brand" : ""} ${value === "O" ? "text-rose-500" : ""}`}
    >
      {value}
    </button>
  );
}

export default function Board({ gameId, playerId, mySymbol, opponentName, onGameOver }) {
  const [game, setGame] = useState(null);
  const [error, setError] = useState("");
  const pollRef = useRef(null);
  const reportedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const g = await api.getGame(gameId);
        if (!cancelled) setGame(g);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }

    poll();
    pollRef.current = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [gameId]);

  useEffect(() => {
    if (!game || reportedRef.current) return;
    if (game.status === "in_progress") return;

    reportedRef.current = true;
    clearInterval(pollRef.current);

    const xId = game.players.X;
    const oId = game.players.O;

    const payload =
      game.status === "draw"
        ? { draw: true, players: [{ player_id: xId }, { player_id: oId }] }
        : game.status === "X"
        ? { winner_id: xId, loser_id: oId }
        : { winner_id: oId, loser_id: xId };

    api.recordResult(payload).catch(() => {
      /* stats failure shouldn't block the UI */
    });

    onGameOver?.(game);
  }, [game, onGameOver]);

  if (error) {
    return <p className="text-rose-600">Couldn't load the game: {error}</p>;
  }

  if (!game) {
    return <p className="text-slate-500 animate-pulse">Loading board…</p>;
  }

  const isMyTurn = game.status === "in_progress" && game.turn === mySymbol;

  const handleClick = async (i) => {
    if (!isMyTurn) return;
    try {
      const updated = await api.makeMove(gameId, playerId, i);
      setGame(updated);
    } catch (e) {
      setError(e.message);
      setTimeout(() => setError(""), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-sm text-slate-500">
          You are <span className="font-semibold">{mySymbol}</span> · Opponent:{" "}
          <span className="font-semibold">{opponentName}</span>
        </p>
        <p className="mt-1 font-medium">
          {game.status === "in_progress" ? (
            isMyTurn ? (
              <span className="text-emerald-600">Your turn</span>
            ) : (
              <span className="text-slate-500">Waiting for opponent…</span>
            )
          ) : game.status === "draw" ? (
            <span className="text-amber-600">It's a draw!</span>
          ) : game.status === mySymbol ? (
            <span className="text-emerald-600">🎉 You won!</span>
          ) : (
            <span className="text-rose-600">You lost this one.</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {game.board.map((value, i) => (
          <Cell key={i} value={value} onClick={() => handleClick(i)} disabled={!isMyTurn} />
        ))}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
