import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Follow the backend PORT so `npm run dev` works regardless of which port
  // the server actually uses (default 4000; e.g. 4001 after a port conflict).
  // Reads PORT from the same places the server does: client/.env, server/.env,
  // repo-root .env — plus Vite's own env loading. No hardcoded backend port.
  const env = {
    ...loadEnv(mode, process.cwd(), ""),
    ...loadEnv(mode, "../server", ""),
    ...loadEnv(mode, "..", ""),
  };
  const port = env.PORT || process.env.PORT || "4000";
  const target = env.VITE_PROXY_TARGET || `http://localhost:${port}`;
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});
