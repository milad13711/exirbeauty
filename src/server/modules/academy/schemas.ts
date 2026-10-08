import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const lesson = z.object({ title: text(120).min(2), minutes: z.number().int().min(1).max(600), body: text(20_000).default("") });
const courseFields = {
  title: text(120).min(3, "عنوان دوره را وارد کنید"),
  description: text(1000),
  audience: z.enum(["ALL", "OWNER", "STAFF"]),
  hours: z.number().min(0.1).max(200),
  price: z.number().int().min(0).max(100_000_000),
  inPlans: z.array(text(40)).max(10),
  published: z.boolean(),
  lessons: z.array(lesson).min(1, "دوره باید حداقل یک درس داشته باشد").max(100),
};
export const courseBody = z.object({ ...courseFields, description: courseFields.description.default(""), audience: courseFields.audience.default("ALL"), price: courseFields.price.default(0), inPlans: courseFields.inPlans.default([]), published: courseFields.published.default(false) });
export const coursePatch = z.object(courseFields).partial();
export const lessonParams = z.object({ n: z.coerce.number().int().min(0).max(1000) });
