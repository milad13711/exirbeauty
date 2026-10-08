import { z } from "zod";

export const answerBody = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).default("") });
export const replyBody = z.object({ text: z.string().trim().min(2, "متن پاسخ را بنویسید").max(1000) });
export const configBody = z.object({ threshold: z.number().int().min(2).max(5) });
export const listQuery = z.object({ route: z.enum(["PUBLIC", "PRIVATE"]).optional(), status: z.enum(["answered", "pending"]).optional(), limit: z.coerce.number().int().min(1).max(200).default(100) });
