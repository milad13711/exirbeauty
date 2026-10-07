import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const toman = z.number().int().min(0).max(1_000_000_000);
const count = z.number().int().min(0).max(1_000_000);

const fields = {
  name: text(80).min(2, "نام کالا را وارد کنید"),
  kind: z.enum(["RETAIL", "CONSUMABLE"]),
  price: toman, cost: toman, stock: count, reorder: count,
  supplier: text(80),
};
// PATCH uses the default-free fields so that fields not sent are left untouched.
// Stock is deliberately not patchable: it moves only through receive / adjust / sales.
const { stock: _stock, ...patchable } = fields; void _stock;
export const productPatch = z.object(patchable).partial();
export const productBody = z.object({ ...fields, kind: fields.kind.default("RETAIL"), price: fields.price.default(0), cost: fields.cost.default(0), stock: fields.stock.default(0), reorder: fields.reorder.default(3), supplier: fields.supplier.default("") });

export const receiveBody = z.object({ qty: z.number().int().min(1).max(1_000_000), unitCost: toman.optional(), note: text(200).default("") });
export const adjustBody = z.object({ stock: count, note: text(200).min(2, "دلیل را بنویسید") });
export const listQuery = z.object({ kind: z.enum(["RETAIL", "CONSUMABLE"]).optional(), low: z.enum(["1"]).optional() });
