import { useState } from "react";
import { api } from "../api.js";

export default function Lobby({ onStart }) {
  const [nameX, setNameX] = useState("");
  const [nameO, setNameO] = useState("");
  const [status, setStatus] = useState("idle"); // idle | starting | error
  const [error, setError] = useState("");

  const handleStart = async (e) => {
    e.preventDefault();
    if (!nameX.trim() || !nameO.trim()) return;

    setStatus("starting");
    setError("");
    try {
      // Register both local players with player-service so the leaderboard
      // can track wins/losses/draws per username, same as before. This is a
      // single one-off call each -- no continuous polling, no network
      // dependency during actual gameplay.
      const playerX = await api.createOrJoinPlayer(nameX.trim());
      const playerO = await api.createOrJoinPlayer(nameO.trim());
      onStart(playerX, playerO);
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Tic-Tac-Toe</h1>
        <p className="text-slate-500 text-sm mt-1">
          Pass-and-play on this device. Enter both names to start.
        </p>
      </div>

      <form onSubmit={handleStart} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-semibold text-brand mb-1">Player X</label>
          <input
            type="text"
            value={nameX}
            onChange={(e) => setNameX(e.target.value)}
            placeholder="Player X's name"
            maxLength={20}
            className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-rose-500 mb-1">Player O</label>
          <input
            type="text"
            value={nameO}
            onChange={(e) => setNameO(e.target.value)}
            placeholder="Player O's name"
            maxLength={20}
            className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <button
          type="submit"
          disabled={status === "starting" || !nameX.trim() || !nameO.trim()}
          className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold rounded-lg py-2 transition-colors mt-2"
        >
          {status === "starting" ? "Starting…" : "Start game"}
        </button>
        {error && <p className="text-rose-600 text-sm text-center">{error}</p>}
      </form>
    </div>
  );
}