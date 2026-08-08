import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const RAINBOW = ["#FF5E5E", "#FF9F5E", "#FFD23F", "#8CE85E", "#5EEBD8", "#5E9FFF", "#8A7FFF", "#FF7EB6"];

function calculateWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every((cell) => cell !== null)) return "draw";
  return null;
}

export default function Board({ playerX, playerO, onGameOver }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [result, setResult] = useState(null); // null | "X" | "O" | "draw"
  const [reported, setReported] = useState(false);
  const [glow, setGlow] = useState(false);

  const canvasRef = useRef(null);
  const cardRef = useRef(null);
  const flashRef = useRef(null);
  const particlesRef = useRef([]);
  const ringsRef = useRef([]);
  const confettiRef = useRef([]);
  const rafRef = useRef(null);

  const currentName = turn === "X" ? playerX.username : playerO.username;

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

  // Particle canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ringsRef.current.forEach((r) => {
        r.r += 16;
        r.life -= 0.018;
        ctx.globalAlpha = Math.max(r.life, 0);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ringsRef.current = ringsRef.current.filter((r) => r.life > 0);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045;
        p.life -= 0.011;
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      confettiRef.current.forEach((c) => {
        c.x += c.vx;
        c.y += c.vy;
        c.rot += c.vr;
        c.life -= 0.004;
        ctx.save();
        ctx.globalAlpha = Math.max(c.life, 0);
        ctx.translate(c.x, c.y);
        ctx.rotate((c.rot * Math.PI) / 180);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
        ctx.restore();
      });
      confettiRef.current = confettiRef.current.filter((c) => c.life > 0 && c.y < canvas.height + 40);

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const ring = (x, y, color) => ringsRef.current.push({ x, y, r: 0, life: 1, color });

  const burst = (x, y, color, n = 50, speedMul = 1) => {
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      const speed = (2 + Math.random() * 5) * speedMul;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: 2 + Math.random() * 2.5,
      });
    }
  };

  const confettiRain = () => {
    const canvas = canvasRef.current;
    for (let i = 0; i < 100; i++) {
      confettiRef.current.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 3,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        size: 5 + Math.random() * 5,
        color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
        life: 1,
      });
    }
  };

  const celebrate = () => {
    const flash = flashRef.current;
    flash.style.transition = "none";
    flash.style.opacity = "0.85";
    requestAnimationFrame(() => {
      flash.style.transition = "opacity .6s ease";
      flash.style.opacity = "0";
    });
    setGlow(true);

    const canvas = canvasRef.current;
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.38;
    ring(cx, cy, "#fff");

    let wave = 0;
    const waveInterval = setInterval(() => {
      burst(cx, cy, RAINBOW[wave % RAINBOW.length], 45, 1 + wave * 0.3);
      ring(cx, cy, RAINBOW[wave % RAINBOW.length]);
      wave++;
      if (wave >= 4) clearInterval(waveInterval);
    }, 220);

    let fw = 0;
    const fwInterval = setInterval(() => {
      burst(
        canvas.width * (0.15 + Math.random() * 0.7),
        canvas.height * (0.1 + Math.random() * 0.3),
        RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
        40
      );
      fw++;
      if (fw >= 5) clearInterval(fwInterval);
    }, 260);

    setTimeout(confettiRain, 400);
  };

  const handleClick = (i) => {
    if (result || board[i] !== null) return;

    const nextBoard = board.slice();
    nextBoard[i] = turn;
    setBoard(nextBoard);

    const outcome = calculateWinner(nextBoard);
    if (outcome) {
      setResult(outcome);
      if (outcome !== "draw") celebrate();
      if (!reported) {
        setReported(true);
        const payload =
          outcome === "draw"
            ? {
                draw: true,
                players: [
                  { player_id: playerX.id, username: playerX.username },
                  { player_id: playerO.id, username: playerO.username },
                ],
              }
            : outcome === "X"
            ? {
                winner_id: playerX.id,
                winner_username: playerX.username,
                loser_id: playerO.id,
                loser_username: playerO.username,
              }
            : {
                winner_id: playerO.id,
                winner_username: playerO.username,
                loser_id: playerX.id,
                loser_username: playerX.username,
              };

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
    setGlow(false);
  };

  return (
    <>
      <div
        ref={flashRef}
        style={{ position: "fixed", inset: 0, background: "#fff", opacity: 0, pointerEvents: "none", zIndex: 10 }}
      />
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 5 }} />

      <div
        ref={cardRef}
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 380,
          background: "rgba(20,16,32,0.75)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 22,
          padding: 26,
          boxShadow: glow
            ? "0 0 80px rgba(255,126,182,0.5), 0 0 40px rgba(94,235,216,0.4)"
            : "0 20px 60px rgba(0,0,0,0.5)",
          transition: "box-shadow .4s",
          fontFamily: "'Inter', sans-serif",
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
            margin: "0 0 20px",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          go supernova
        </p>

        <p style={{ textAlign: "center", fontSize: 13, color: "#D8D2EC", margin: "0 0 16px" }}>
          {result === null ? (
            <>
              <span style={{ color: turn === "X" ? "#5EEBD8" : "#FF7EB6", fontWeight: 600 }}>{currentName}</span>
              's turn ({turn})
            </>
          ) : result === "draw" ? (
            "It's a draw"
          ) : (
            `${result === "X" ? playerX.username : playerO.username} (${result}) wins!`
          )}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 9,
            maxWidth: 270,
            margin: "0 auto",
          }}
        >
          {board.map((value, i) => (
            <button
              key={i}
              onClick={() => handleClick(i)}
              disabled={result !== null || value !== null}
              style={{
                aspectRatio: "1",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 30,
                fontWeight: 700,
                cursor: result !== null || value !== null ? "default" : "pointer",
                color: value === "X" ? "#5EEBD8" : value === "O" ? "#FF7EB6" : "transparent",
                textShadow:
                  value === "X"
                    ? "0 0 12px rgba(94,235,216,0.7)"
                    : value === "O"
                    ? "0 0 12px rgba(255,126,182,0.7)"
                    : "none",
              }}
            >
              {value}
            </button>
          ))}
        </div>

        {result !== null && (
          <button
            onClick={handleRestart}
            style={{
              marginTop: 18,
              width: "100%",
              padding: 11,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 12,
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Play again (same players)
          </button>
        )}
      </div>

      <style>{`
        @keyframes hue { to { background-position: 300% 0; } }
      `}</style>
    </>
  );
}