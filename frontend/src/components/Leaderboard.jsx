import { useEffect, useState } from "react";
import { api } from "../api.js";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    api
      .leaderboard()
      .then((data) => {
        setRows(data);
        setError("");
        requestAnimationFrame(() => setVisible(true));
      })
      .catch((e) => setError(e.message));
  }, [refreshKey]);

  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        padding: "0 8px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <h2
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 16,
          fontWeight: 800,
          margin: "0 0 18px",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        🏆 LEADERBOARD
      </h2>

      {error && <p style={{ color: "#FF5E5E", fontSize: 13 }}>{error}</p>}

      {rows.length === 0 && !error ? (
        <p style={{ color: "#6b6685", fontSize: 13 }}>No games played yet — be the first!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 110px 70px",
              fontSize: 10,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "#6b6685",
              padding: "0 10px 8px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span>#</span>
            <span>Player</span>
            <span style={{ textAlign: "center" }}>W / L / D</span>
            <span style={{ textAlign: "right" }}>Win %</span>
          </div>

          {rows.map((r, i) => (
            <div
              key={r.player_id}
              style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr 110px 70px",
                alignItems: "center",
                padding: "10px 10px",
                borderRadius: 12,
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(8px)",
                transition: `opacity .35s ease ${i * 0.04}s, transform .35s ease ${i * 0.04}s`,
              }}
            >
              <span style={{ fontSize: 13, color: "#6b6685" }}>{MEDALS[i] || i + 1}</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  paddingRight: 8,
                }}
              >
                {r.username}
              </span>
              <span style={{ fontSize: 12, textAlign: "center", whiteSpace: "nowrap" }}>
                <span style={{ color: "#8CE85E" }}>{r.wins}</span>
                {" / "}
                <span style={{ color: "#FF5E5E" }}>{r.losses}</span>
                {" / "}
                <span style={{ color: "#FFD23F" }}>{r.draws}</span>
              </span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#D8D2EC" }}>{Math.round(r.win_rate * 100)}%</span>
                <span
                  style={{
                    width: 56,
                    height: 4,
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      height: "100%",
                      width: visible ? `${Math.round(r.win_rate * 100)}%` : "0%",
                      background: "linear-gradient(90deg,#5EEBD8,#8A7FFF,#FF7EB6)",
                      transition: `width .6s ease ${i * 0.04 + 0.1}s`,
                    }}
                  />
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}