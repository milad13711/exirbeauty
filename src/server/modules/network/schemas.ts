import { z } from "zod";
import { isCategory } from "./catalog";

export const requestBody = z.object({ category: z.string().refine(isCategory, "دسته‌ی نامعتبر"), note: z.string().trim().max(500).default("") });
export const adminListQuery = z.object({ status: z.enum(["SUBMITTED", "REVIEWING", "ANSWERED"]).optional() });
export const adminUpdateBody = z.object({ status: z.enum(["REVIEWING", "ANSWERED"]), response: z.string().trim().max(1000).optional() });
