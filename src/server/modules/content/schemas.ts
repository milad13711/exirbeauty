import { z } from "zod";
import { dateStr } from "../cashier/schemas";

const text = (max: number) => z.string().trim().max(max);
export const postBody = z.object({
  kind: z.enum(["BEFORE_AFTER", "SERVICE", "OFFER", "BIRTHDAY", "TIPS"]),
  caption: text(2200).min(5, "متن کپشن را بنویسید"),
  tags: z.array(text(40)).max(15).default([]),
  service: text(80).nullish(),
  beforeMediaId: z.string().min(1).max(40).nullish(),
  afterMediaId: z.string().min(1).max(40).nullish(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]).default("DRAFT"),
  scheduledFor: dateStr.nullish(),
});
export const postPatch = z.object({ caption: postBody.shape.caption, tags: postBody.shape.tags, service: postBody.shape.service, status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]), scheduledFor: dateStr.nullable() }).partial();
