// Pure academy rules (no DB).
export type Lesson = { title: string; minutes: number; body: string };
export type Audience = "ALL" | "OWNER" | "STAFF";

/** Owners see owner and general courses, specialists see staff and general ones. */
export const visibleTo = (audience: Audience, role: string) => audience === "ALL" || (audience === "OWNER" ? role !== "STAFF" : role === "STAFF");

/** In the salon's plan (or free) means no charge. */
export const isFree = (c: { price: number; inPlans: string[] }, planCode: string | null) => c.price === 0 || (!!planCode && c.inPlans.includes(planCode));

export const progress = (done: number[], lessonCount: number) => (lessonCount ? Math.min(100, Math.round((new Set(done).size / lessonCount) * 100)) : 0);
export const isComplete = (done: number[], lessonCount: number) => lessonCount > 0 && new Set(done).size >= lessonCount;

/** Lesson numbers are indexes into the course; only existing ones count. */
export const validLesson = (n: number, lessonCount: number) => Number.isInteger(n) && n >= 0 && n < lessonCount;

export const serialFor = (enrollmentId: string, at: Date) => `EX-${at.getUTCFullYear()}-${enrollmentId.slice(-6).toUpperCase()}`;
