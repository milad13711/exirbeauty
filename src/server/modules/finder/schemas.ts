import { z } from "zod";
import { CITIES, FINDER_CATS } from "@/lib/finder";
import { digits } from "@/lib/validate";

const phone = z.string().transform((s) => digits(s).replace(/[\s-]/g, "")).pipe(z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"));
const cat = z.enum(FINDER_CATS as [string, ...string[]]);
const cityNames = new Set(CITIES.map((c) => c.name));

const staff = z.object({ name: z.string().trim().min(2).max(60), cats: z.array(cat).min(1).max(7) });

/** Fields an owner controls (create and edit share this shape; the plan is fixed at creation). */
export const listingBody = z.object({
  name: z.string().trim().min(3).max(60),
  brand: z.string().trim().min(2).max(60).optional(),
  phone,
  city: z.string().refine((c) => cityNames.has(c), "شهر نامعتبر است"),
  x: z.number().min(0).max(582),
  y: z.number().min(0).max(528),
  cats: z.array(cat).min(1).max(7),
  bio: z.string().trim().max(500).default(""),
  staff: z.array(staff).max(10).default([]),
});
export type ListingBody = z.infer<typeof listingBody>;

export const createListing = listingBody.extend({ plan: z.enum(["free", "artist", "salon"]) });

export const reviewBody = z.object({ name: z.string().trim().min(2).max(40), rating: z.number().int().min(1).max(5), text: z.string().trim().min(3).max(500) });
export const leadBody = z.object({ name: z.string().trim().min(2).max(60), phone, note: z.string().trim().max(300).default("") });
export const rejectBody = z.object({ reason: z.string().trim().max(200).default("") });

export const listQuery = z.object({
  city: z.string().optional(),
  cat: z.string().optional(),
  q: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
