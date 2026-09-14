import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Served from "/" by frame-kit's own server, but relative paths keep the
  // build independent of where it is mounted.
  base: "./",
  plugins: [react()],
  server: {
    port: 5051, // 5050 is Card Anvil; 4620 is the studio API
    proxy: { "/api": "http://127.0.0.1:4620" },
  },
  build: {
    // Straight into the package that ships it, so `files: ["dist"]` picks it
    // up. emptyOutDir must be explicit because this is outside the project
    // root; it only ever clears dist/studio, never dist/cli or dist/schema.
    outDir: "../frame-kit/dist/studio",
    emptyOutDir: true,
    target: "es2022",
  },
});
