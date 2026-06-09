import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/player-valuation-analytics/",
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: ["**/.venv/**", "**/Model/**", "**/node_modules/**"],
    },
  },
});
