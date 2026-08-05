import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During local `npm run dev` (outside Docker), proxy API calls to
    // services running on localhost so you don't hit CORS issues.
    proxy: {
      "/api/game": { target: "http://localhost:5001", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/game/, "") },
      "/api/player": { target: "http://localhost:5002", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/player/, "") },
      "/api/match": { target: "http://localhost:5000", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/match/, "") },
      "/api/stats": { target: "http://localhost:5003", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/stats/, "") },
    },
  },
});
