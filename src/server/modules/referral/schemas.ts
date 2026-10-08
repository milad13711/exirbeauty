import { z } from "zod";

export const configBody = z.object({ enabled: z.boolean(), referrerPts: z.number().int().min(0).max(100_000), friendOff: z.number().int().min(0).max(60) });
