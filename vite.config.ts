import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const TESOURO_CSV_PATH =
  "/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/Tesouro-Direto-Benchmark/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // Dev proxy: bypasses CORS by routing through Vite server
      "/api/tesouro-csv": {
        target: "https://www.tesourotransparente.gov.br",
        changeOrigin: true,
        rewrite: () => TESOURO_CSV_PATH,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Referer", "https://www.tesourotransparente.gov.br/");
          });
        },
      },
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
}));
