import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

export default function Lobby({ onStart }) {
  const [nameX, setNameX] = useState("");
  const [nameO, setNameO] = useState("");
  const [status, setStatus] = useState("idle"); // idle | starting | error
  const [error, setError] = useState("");

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const starsRef = useRef([]);
  const shootRef = useRef(null);
  const rafRef = useRef(null);

  // Load display fonts once
  useEffect(() => {
    if (!document.getElementById("rainbow-fonts")) {
      const link = document.createElement("link");
      link.id = "rainbow-fonts";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Inter:wght@400;500&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  // Starfield canvas animation
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = stage.clientWidth;
      canvas.height = stage.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    if (starsRef.current.length === 0) {
      starsRef.current = Array.from({ length: 120 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.4 + 0.3,
        tw: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03,
      }));
    }

    const maybeShoot = () => {
      if (!shootRef.current && Math.random() < 0.01) {
        shootRef.current = {
          x: Math.random() * canvas.width * 0.6,
          y: Math.random() * canvas.height * 0.3,
          vx: 6 + Math.random() * 3,
          vy: 3 + Math.random() * 2,
          life: 1,
        };
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      starsRef.current.forEach((s) => {
        s.tw += s.speed;
        const alpha = 0.4 + Math.sin(s.tw) * 0.4;
        ctx.globalAlpha = Math.max(alpha, 0.05);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      maybeShoot();
      const shoot = shootRef.current;
      if (shoot) {
        ctx.globalAlpha = shoot.life;
        ctx.strokeStyle = "#5EEBD8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(shoot.x, shoot.y);
        ctx.lineTo(shoot.x - shoot.vx * 4, shoot.y - shoot.vy * 4);
        ctx.stroke();
        shoot.x += shoot.vx;
        shoot.y += shoot.vy;
        shoot.life -= 0.02;
        if (shoot.life <= 0 || shoot.x > canvas.width || shoot.y > canvas.height) {
          shootRef.current = null;
        }
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

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
    <div
      ref={stageRef}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 440,
        minHeight: 480,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 26,
        overflow: "hidden",
        background: "radial-gradient(ellipse at 50% 30%, #1a0f2e 0%, #050508 70%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 340,
          margin: "32px 16px",
          background: "rgba(15,10,26,0.55)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 22,
          padding: 26,
          boxShadow: "0 0 80px rgba(138,127,255,0.15)",
        }}
      >
        <h1
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 22,
            fontWeight: 800,
            textAlign: "center",
            margin: "0 0 4px",
            background: "linear-gradient(90deg,#FF5E5E,#FFD23F,#5EEBD8,#8A7FFF,#FF7EB6)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            backgroundSize: "300% 100%",
            animation: "hue 6s linear infinite",
          }}
        >
          TIC TAC TOE
        </h1>
        <p
          style={{
            fontSize: 11,
            color: "#9B95B5",
            textAlign: "center",
            margin: "0 0 22px",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          go supernova
        </p>

        <form onSubmit={handleStart} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                marginBottom: 6,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: "#5EEBD8",
              }}
            >
              Player X
            </label>
            <input
              type="text"
              value={nameX}
              onChange={(e) => setNameX(e.target.value)}
              placeholder="Player X's name"
              maxLength={20}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                color: "#fff",
                fontSize: 14,
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#5EEBD8";
                e.target.style.boxShadow = "0 0 0 3px rgba(94,235,216,0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.15)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                marginBottom: 6,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: "#FF7EB6",
              }}
            >
              Player O
            </label>
            <input
              type="text"
              value={nameO}
              onChange={(e) => setNameO(e.target.value)}
              placeholder="Player O's name"
              maxLength={20}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                color: "#fff",
                fontSize: 14,
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#FF7EB6";
                e.target.style.boxShadow = "0 0 0 3px rgba(255,126,182,0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.15)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={status === "starting" || !nameX.trim() || !nameO.trim()}
            style={{
              width: "100%",
              padding: 13,
              marginTop: 6,
              border: "none",
              borderRadius: 12,
              cursor: status === "starting" ? "default" : "pointer",
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 1,
              color: "#0A0A12",
              background: "linear-gradient(90deg,#FF5E5E,#FFD23F,#5EEBD8,#8A7FFF,#FF7EB6)",
              backgroundSize: "300% 100%",
              animation: "hue 4s linear infinite",
              boxShadow: "0 0 30px rgba(255,126,182,0.35)",
              opacity: status === "starting" || !nameX.trim() || !nameO.trim() ? 0.5 : 1,
            }}
          >
            {status === "starting" ? "STARTING…" : "START GAME"}
          </button>

          {error && (
            <p style={{ color: "#FF5E5E", fontSize: 12, textAlign: "center", margin: 0 }}>{error}</p>
          )}
        </form>
      </div>

      <style>{`
        @keyframes hue { to { background-position: 300% 0; } }
      `}</style>
    </div>
  );
}