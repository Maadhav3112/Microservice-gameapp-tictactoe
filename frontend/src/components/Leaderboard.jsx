import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Leaderboard({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .leaderboard()
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [refreshKey]);

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4">🏆 Leaderboard</h2>

      {error && <p className="text-rose-600 text-sm">{error}</p>}

      {rows.length === 0 && !error ? (
        <p className="text-slate-400 text-sm">No games played yet — be the first!</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2">#</th>
              <th className="py-2">Player</th>
              <th className="py-2 text-center">W</th>
              <th className="py-2 text-center">L</th>
              <th className="py-2 text-center">D</th>
              <th className="py-2 text-right">Win %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.player_id} className="border-b border-slate-50">
                <td className="py-2 text-slate-400">{i + 1}</td>
                <td className="py-2 font-medium text-slate-700">{r.username}</td>
                <td className="py-2 text-center text-emerald-600">{r.wins}</td>
                <td className="py-2 text-center text-rose-500">{r.losses}</td>
                <td className="py-2 text-center text-amber-500">{r.draws}</td>
                <td className="py-2 text-right text-slate-500">{Math.round(r.win_rate * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
