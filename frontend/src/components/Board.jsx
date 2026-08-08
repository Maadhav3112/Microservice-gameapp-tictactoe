import { useState } from "react";
import { api } from "../api.js";

const CELL_BASE =
  "flex items-center justify-center h-24 w-24 sm:h-28 sm:w-28 bg-white rounded-xl shadow-sm border border-slate-200 text-4xl font-bold transition-colors";

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],           // diagonals
];

function calculateWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // "X" or "O"
    }
  }
  if (board.every((cell) => cell !== null)) return "draw";
  return null;
}

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

export default function Board({ playerX, playerO, onGameOver }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [result, setResult] = useState(null); // null | "X" | "O" | "draw"
  const [reported, setReported] = useState(false);

  const currentName = turn === "X" ? playerX.username : playerO.username;

  const handleClick = (i) => {
    if (result || board[i] !== null) return;

    const nextBoard = board.slice();
    nextBoard[i] = turn;
    setBoard(nextBoard);

    const outcome = calculateWinner(nextBoard);
    if (outcome) {
      setResult(outcome);
      if (!reported) {
        setReported(true);
        const payload =
          outcome === "draw"
            ? { draw: true, players: [{ player_id: playerX.id }, { player_id: playerO.id }] }
            : outcome === "X"
            ? { winner_id: playerX.id, loser_id: playerO.id }
            : { winner_id: playerO.id, loser_id: playerX.id };

        // Single one-off call to record the result -- not continuous
        // polling, so a brief network blip here just fails quietly and
        // doesn't affect the game that was already played locally.
        api.recordResult(payload).catch(() => {});
        onGameOver?.();
      }
      return;
    }

    setTurn(turn === "X" ? "O" : "X");
  };

  const handleRestart = () => {
    setBoard(Array(9).fill(null));
    setTurn("X");
    setResult(null);
    setReported(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-brand">{playerX.username}</span> (X) vs{" "}
          <span className="font-semibold text-rose-500">{playerO.username}</span> (O)
        </p>
        <p className="mt-1 font-medium">
          {result === null ? (
            <span className="text-slate-700">
              <span className={turn === "X" ? "text-brand" : "text-rose-500"}>{currentName}</span>'s
              turn ({turn})
            </span>
          ) : result === "draw" ? (
            <span className="text-amber-600">It's a draw!</span>
          ) : (
            <span className="text-emerald-600">
              🎉 {result === "X" ? playerX.username : playerO.username} wins!
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {board.map((value, i) => (
          <Cell key={i} value={value} onClick={() => handleClick(i)} disabled={result !== null} />
        ))}
      </div>

      {result !== null && (
        <button
          onClick={handleRestart}
          className="bg-brand hover:bg-brand-dark text-white font-semibold rounded-lg px-4 py-2 transition-colors"
        >
          Play again (same players)
        </button>
      )}
    </div>
  );
}