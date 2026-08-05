import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

export default function Lobby({ onMatched }) {
  const [username, setUsername] = useState("");
  const [player, setPlayer] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | joining | waiting | error
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setStatus("joining");
    setError("");
    try {
      const createdPlayer = await api.createOrJoinPlayer(username.trim());
      setPlayer(createdPlayer);

      const result = await api.joinQueue(createdPlayer.id, createdPlayer.username);
      if (result.status === "matched") {
        onMatched(createdPlayer, result.match);
        return;
      }

      setStatus("waiting");
      pollRef.current = setInterval(async () => {
        const check = await api.queueStatus(createdPlayer.id);
        if (check.status === "matched") {
          clearInterval(pollRef.current);
          onMatched(createdPlayer, check.match);
        }
      }, 1500);
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  const handleCancel = async () => {
    clearInterval(pollRef.current);
    if (player) await api.leaveQueue(player.id).catch(() => {});
    setStatus("idle");
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Tic-Tac-Toe Online</h1>
        <p className="text-slate-500 text-sm mt-1">Pick a name and we'll find you an opponent.</p>
      </div>

      {status !== "waiting" ? (
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your username"
            maxLength={20}
            className="border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="submit"
            disabled={status === "joining" || !username.trim()}
            className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold rounded-lg py-2 transition-colors"
          >
            {status === "joining" ? "Joining…" : "Find a match"}
          </button>
          {error && <p className="text-rose-600 text-sm text-center">{error}</p>}
        </form>
      ) : (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="h-10 w-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600">Waiting for another player to join…</p>
          <button
            onClick={handleCancel}
            className="text-sm text-slate-500 underline hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
