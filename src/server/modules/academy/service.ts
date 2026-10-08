import { prisma } from "../../db";
import { HttpError, badRequest, conflict, forbidden, notFound } from "../../http/errors";
import type { Session } from "../../http/types";
import { getTenantEntitlements } from "../../platform/modules/service";
import { isComplete, isFree, progress, serialFor, validLesson, visibleTo, type Audience, type Lesson } from "./rules";

// Courses are platform content (not per-salon); enrollments belong to a person within a salon.

const lessonsOf = (c: { lessons: unknown }) => (c.lessons as Lesson[]) ?? [];
const planCodeOf = async (tenantId: string) => (await getTenantEntitlements(tenantId)).plan?.code ?? null;

type CourseRow = { id: string; title: string; description: string; audience: string; hours: number; price: number; inPlans: string[]; published: boolean; lessons: unknown };
const card = (c: CourseRow, e: { id: string; done: number[]; completedAt: Date | null } | undefined, planCode: string | null) => ({
  id: c.id, title: c.title, description: c.description, audience: c.audience, hours: c.hours, price: c.price, lessonCount: lessonsOf(c).length,
  free: isFree(c, planCode), enrolled: !!e, progress: e ? progress(e.done, lessonsOf(c).length) : 0, completed: !!e?.completedAt, enrollmentId: e?.id ?? null,
});

export async function list(s: Session) {
  const [courses, mine, planCode] = await Promise.all([
    prisma.course.findMany({ where: { published: true }, orderBy: { createdAt: "asc" } }),
    prisma.enrollment.findMany({ where: { userId: s.userId, tenantId: s.tenantId! } }),
    planCodeOf(s.tenantId!),
  ]);
  const by = new Map(mine.map((e) => [e.courseId, e]));
  return courses.filter((c) => visibleTo(c.audience as Audience, s.role)).map((c) => card(c, by.get(c.id), planCode));
}

async function visibleCourse(s: Session, id: string) {
  const c = await prisma.course.findFirst({ where: { id, published: true } });
  if (!c || !visibleTo(c.audience as Audience, s.role)) throw notFound("دوره پیدا نشد");
  return c;
}

/** Lesson titles are public to anyone who can see the course; the lesson text is only for enrolled people. */
export async function detail(s: Session, id: string) {
  const c = await visibleCourse(s, id);
  const e = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: s.userId, courseId: id } } });
  const planCode = await planCodeOf(s.tenantId!);
  return { ...card(c, e ?? undefined, planCode), done: e?.done ?? [], lessons: lessonsOf(c).map((l) => ({ title: l.title, minutes: l.minutes, ...(e ? { body: l.body } : {}) })) };
}

export async function enrollFree(s: Session, id: string) {
  const c = await visibleCourse(s, id);
  if (!isFree(c, await planCodeOf(s.tenantId!))) throw new HttpError(402, "PAYMENT_REQUIRED", "این دوره پولی است؛ ثبت‌نام با پرداخت انجام می‌شود");
  await createEnrollment(s.tenantId!, s.userId, id, 0);
  return detail(s, id);
}

/** Idempotent: enrolling twice (or a replayed payment callback) leaves one enrollment. */
export async function createEnrollment(tenantId: string, userId: string, courseId: string, paid: number) {
  await prisma.enrollment.upsert({ where: { userId_courseId: { userId, courseId } }, create: { tenantId, userId, courseId, paid }, update: {} });
}

/** Price check for the payments service: the amount always comes from the course row. */
export async function quoteCourse(s: { userId: string; role: string; tenantId: string }, courseId: string) {
  const c = await prisma.course.findFirst({ where: { id: courseId, published: true } });
  if (!c || !visibleTo(c.audience as Audience, s.role)) throw notFound("دوره پیدا نشد");
  if (isFree(c, await planCodeOf(s.tenantId))) throw conflict("این دوره برای شما رایگان است؛ پرداخت لازم نیست", "FREE_COURSE");
  if (await prisma.enrollment.count({ where: { userId: s.userId, courseId } })) throw conflict("قبلاً در این دوره ثبت‌نام کرده‌اید", "ALREADY_ENROLLED");
  return c;
}

export async function completeLesson(s: Session, id: string, n: number) {
  const c = await visibleCourse(s, id);
  const e = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: s.userId, courseId: id } } });
  if (!e) throw forbidden("ابتدا در دوره ثبت‌نام کنید", "NOT_ENROLLED");
  const count = lessonsOf(c).length;
  if (!validLesson(n, count)) throw badRequest("شماره‌ی درس نامعتبر است");
  const done = [...new Set([...e.done, n])].sort((a, b) => a - b);
  const complete = isComplete(done, count) && !e.completedAt;
  const now = new Date();
  await prisma.enrollment.update({ where: { id: e.id }, data: { done, ...(complete ? { completedAt: now, serial: serialFor(e.id, now) } : {}) } });
  return detail(s, id);
}

export async function certificate(s: Session, enrollmentId: string) {
  const e = await prisma.enrollment.findFirst({ where: { id: enrollmentId, userId: s.userId }, include: { course: { select: { title: true, hours: true } } } });
  if (!e) throw notFound("گواهی پیدا نشد");
  if (!e.completedAt || !e.serial) throw conflict("هنوز دوره را کامل نکرده‌اید", "NOT_COMPLETED");
  const tenant = await prisma.tenant.findUnique({ where: { id: e.tenantId }, select: { name: true } });
  return { serial: e.serial, name: s.name, salon: tenant?.name ?? "", course: e.course.title, hours: e.course.hours, completedAt: e.completedAt };
}

// ───────── platform team: the catalog ─────────

export const adminList = () => prisma.course.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { enrollments: true } } } })
  .then((rows) => rows.map((c) => ({ id: c.id, title: c.title, description: c.description, audience: c.audience, hours: c.hours, price: c.price, inPlans: c.inPlans, published: c.published, lessons: lessonsOf(c), enrollments: c._count.enrollments })));
export const adminCreate = (b: { title: string; description: string; audience: Audience; hours: number; price: number; inPlans: string[]; published: boolean; lessons: Lesson[] }) => prisma.course.create({ data: b });
export async function adminUpdate(id: string, b: Partial<{ title: string; description: string; audience: Audience; hours: number; price: number; inPlans: string[]; published: boolean; lessons: Lesson[] }>) {
  if (!(await prisma.course.count({ where: { id } }))) throw notFound("دوره پیدا نشد");
  return prisma.course.update({ where: { id }, data: b });
}
