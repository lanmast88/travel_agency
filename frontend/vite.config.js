import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api/v1/tours": {
        target: "http://localhost:8002",
        changeOrigin: true,
      },
      "/api/v1/cities": {
        target: "http://localhost:8002",
        changeOrigin: true,
      },
      "/api/v1/hotels": {
        target: "http://localhost:8002",
        changeOrigin: true,
      },
      "/api/v1/clients": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
      "/api/v1/sales": {
        target: "http://localhost:8003",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
