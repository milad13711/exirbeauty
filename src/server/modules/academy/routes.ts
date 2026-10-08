import type { Route } from "../../http/types";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { startCoursePayment } from "../../platform/payments/service";
import { coursePatch, courseBody, lessonParams } from "./schemas";
import * as svc from "./service";

const PEOPLE = { roles: ["OWNER", "STAFF"] } as const; // salon owners and specialists (admins manage the catalog instead)
const ADMIN = { roles: ["ADMIN", "SUPER_ADMIN"] } as const;

export const academyRoutes: Route[] = [
  { method: "GET", path: "/academy/courses", auth: PEOPLE, handler: async (c) => svc.list(c.session!) },
  { method: "GET", path: "/academy/courses/:id", auth: PEOPLE, handler: async (c) => svc.detail(c.session!, c.params.id) },
  { method: "POST", path: "/academy/courses/:id/enroll", auth: PEOPLE, handler: async (c) => svc.enrollFree(c.session!, c.params.id) },
  { method: "POST", path: "/academy/courses/:id/pay", auth: PEOPLE, handler: async (c) => startCoursePayment({ userId: c.session!.userId, role: c.session!.role, tenantId: c.session!.tenantId! }, c.params.id) },
  { method: "POST", path: "/academy/courses/:id/lessons/:n/complete", auth: PEOPLE, handler: async (c) => svc.completeLesson(c.session!, c.params.id, parse(lessonParams, { n: c.params.n }).n) },
  { method: "GET", path: "/academy/enrollments/:id/certificate", auth: PEOPLE, handler: async (c) => svc.certificate(c.session!, c.params.id) },

  // The platform team's catalog.
  { method: "GET", path: "/admin/academy/courses", auth: ADMIN, module: false, handler: async () => svc.adminList() },
  { method: "POST", path: "/admin/academy/courses", auth: ADMIN, module: false, handler: async (c) => { const r = await svc.adminCreate(parse(courseBody, await c.body())); await audit(c.session, "academy.course.create", "Course", r.id); return r; } },
  { method: "PATCH", path: "/admin/academy/courses/:id", auth: ADMIN, module: false, handler: async (c) => { const r = await svc.adminUpdate(c.params.id, parse(coursePatch, await c.body())); await audit(c.session, "academy.course.update", "Course", r.id); return r; } },
];
