import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  NODE_ENV: z.string().default("development"),
});

let cached: z.infer<typeof schema> | null = null;

/** Validated lazily so `next build` and unit tests don't need a full environment. */
export function env() {
  return (cached ??= schema.parse(process.env));
}
