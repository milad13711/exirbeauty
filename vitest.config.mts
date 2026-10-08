import { defineConfig } from "vitest/config";
import path from "node:path";
import { loadEnv } from "vite";

const env = loadEnv("test", process.cwd(), "");
// Every test file opens its own Prisma pool and the files run in parallel: cap both, or the dozens of integration
// files together can exhaust Postgres' connection limit and fail at random.
if (env.DATABASE_URL && !env.DATABASE_URL.includes("connection_limit")) env.DATABASE_URL += `${env.DATABASE_URL.includes("?") ? "&" : "?"}connection_limit=10`;

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { include: ["src/**/*.test.ts"], environment: "node", env, maxWorkers: 4 },
});
