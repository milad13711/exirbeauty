import { z } from "zod";
import { MIN_AMOUNT } from "./rules";

const text = (max: number) => z.string().trim().max(max);
const id = z.string().min(1).max(40);

export const issueBody = z.object({
  buyerId: id.nullish(),
  fromName: text(80).default(""),
  toName: text(80).min(2, "نام گیرنده را وارد کنید"),
  toPhone: z.string().trim().max(20),
  occasion: text(40).default(""),
  message: text(300).default(""),
  amount: z.number().int().min(MIN_AMOUNT, "حداقل مبلغ کارت هدیه ۱۰۰ هزار تومان است").max(100_000_000),
  payments: z.array(z.object({ method: z.enum(["CASH", "CARD", "ONLINE", "WALLET"]), amount: z.number().int().min(1).max(100_000_000) })).max(4).default([]),
});
export const lookupBody = z.object({ code: z.string().trim().min(8).max(30) });
export const listQuery = z.object({ status: z.enum(["ACTIVE", "USED", "VOID"]).optional() });
