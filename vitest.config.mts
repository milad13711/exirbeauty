import { defineConfig } from "vitest/config";
import path from "node:path";
import { loadEnv } from "vite";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { include: ["src/**/*.test.ts"], environment: "node", env: loadEnv("test", process.cwd(), "") },
});
