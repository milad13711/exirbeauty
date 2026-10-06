import { z } from "zod";
import { HttpError } from "./errors";

export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new HttpError(422, "VALIDATION_FAILED", "اطلاعات واردشده معتبر نیست", r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  return r.data;
}
