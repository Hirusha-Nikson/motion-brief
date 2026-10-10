import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// GitHub Pages serves the site at /<repo>/. Override with BASE_PATH for other hosts.
const PAGES_BASE = "/motion-brief/";

export default defineConfig(({ command, isPreview }) => ({
  base: process.env.BASE_PATH ?? (command === "build" || isPreview ? PAGES_BASE : "/"),
  plugins: [react()],
  resolve: {
    // Use the shared package's source directly: one schema, no stale build.
    alias: {
      "@motionbrief/brief": fileURLToPath(
        new URL("../../packages/brief/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
  },
}));
