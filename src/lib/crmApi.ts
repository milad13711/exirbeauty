"use client";
import { api } from "./api";

// ───────── types (mirror the backend responses) ─────────
export type Role = "SUPER_ADMIN" | "ADMIN" | "OWNER" | "STAFF";
export type Me = { userId: string; role: Role; tenantId: string | null; name: string };

export type Gender = "FEMALE" | "MALE" | "OTHER";
export type BeautyProfile = {
  hair?: { current?: string; type?: string; state?: string; brand?: string; oxidant?: string; lastColor?: string; formula?: string; history?: string[] };
  skin?: { type?: string; used?: string; allergies?: string; facials?: string[] };
  nail?: { services?: string; colors?: string; allergies?: string };
};
export type CustomerRow = { id: string; name: string; phone: string; gender: Gender; tags: string[]; source: string; createdAt: string; birthDate: string | null };
export type Visit = { id: string; at: string; service: string; category: string; staffName: string; price: number; note: string };
export type CustomerFull = CustomerRow & { note: string; allergies: string[]; occasions: string[]; beauty: BeautyProfile; referredById: string | null; visits: Visit[]; stats: { visitCount: number; totalSpent: number; lastVisitAt: string | null } };
export type CustomerInput = Partial<Pick<CustomerFull, "name" | "phone" | "gender" | "note" | "tags" | "allergies" | "occasions" | "beauty" | "source">> & { birthDate?: string | null };

export type Break = { s: number; e: number; label: string };
export type Staff = { id: string; name: string; title: string; color: string; phone: string; bio: string; commissionPct: number; startMin: number; endMin: number; daysOff: number[]; breaks: Break[]; active: boolean; listed: boolean; loginPhone: string | null };
export type Leave = { id: string; fromDate: string; toDate: string; reason: string };
export type StaffFull = Staff & { leaves: Leave[]; services: { id: string; name: string }[] };
export type StaffInput = Partial<Pick<Staff, "name" | "title" | "color" | "phone" | "bio" | "commissionPct" | "startMin" | "endMin" | "daysOff" | "breaks" | "active" | "listed">>;

export type Service = { id: string; category: string; name: string; price: number; durationMin: number; materials: string; materialCost: number; commissionPct: number; capacity: number; discountNote: string; packageNote: string; active: boolean; staffIds: string[] };
export type ServiceInput = Partial<Omit<Service, "id">>;

export type ApptStatus = "PENDING" | "CONFIRMED" | "IN_SERVICE" | "DONE" | "CANCELED" | "NO_SHOW";
export type Appt = { id: string; status: ApptStatus; source: "STAFF" | "ONLINE"; date: string; startMin: number; durationMin: number; startAt: string; customerId: string; customerName?: string; customerPhone?: string; staffId: string; staffName?: string; serviceId: string | null; serviceName: string; category: string; price: number; note: string; cancelReason: string | null };
export type DayHours = { open: boolean; start: number; end: number };
export type CalSettings = { hours: DayHours[]; onlineEnabled: boolean; autoConfirm: boolean; leadHours: number; cancelHours: number; stepMin: number };
export type Availability = { date: string; durationMin: number; staff: { staffId: string; name: string; starts: number[] }[] };
export type WaitEntry = { id: string; name: string; phone: string; serviceId: string; staffId: string | null; fromDate: string; toDate: string; note: string; status: string; createdAt: string };

export type PublicSalon = { name: string; city: string; services: { id: string; category: string; name: string; price: number; durationMin: number; staffIds: string[] }[]; staff: { id: string; name: string; title: string; color: string; bio: string }[] };
export type Receipt = { id: string; status: ApptStatus; date: string; startMin: number; serviceName: string; staffName: string };

export type PayMethod = "CASH" | "CARD" | "ONLINE";
export type SaleStatus = "PAID" | "DEBT" | "VOID";
export type SaleLineIn = { kind: "SERVICE" | "PRODUCT" | "OTHER"; refId?: string | null; name: string; qty: number; price: number; staffId?: string | null; commissionPct?: number };
export type SaleView = {
  id: string; number: number; code: string; date: string; customerId: string | null; customerName: string; apptId: string | null;
  subtotal: number; discountPct: number; discount: number; total: number; paid: number; debt: number; status: SaleStatus; note: string; voidReason: string | null; createdAt: string;
  lines: (SaleLineIn & { id: string })[]; payments: { method: PayMethod; amount: number; ref: string }[];
};
export type ExpenseView = { id: string; date: string; title: string; amount: number; method: PayMethod; category: string };
export type DebtRow = { customerId: string; name: string; phone: string; debt: number; invoices: number; since: string | null };
export type Summary = { from: string; to: string; count: number; revenue: number; services: number; products: number; discounts: number; cash: number; card: number; online: number; newDebt: number; debtCollected: number; expenses: number; net: number; cashExpected: number; byStaff: { staffId: string; name: string; revenue: number; commission: number }[] };
export type DayStatus = { date: string; closed: boolean; closing: { expectedCash: number; countedCash: number; difference: number; note: string; closedAt: string } | null; expectedCash: number; summary: Summary };

const qs = (o: Record<string, string | number | undefined>) => { const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString(); return p ? `?${p}` : ""; };

export const crm = {
  // auth
  me: () => api<Me>("GET", "/auth/me"),
  otpRequest: (phone: string) => api<{ expiresIn: number }>("POST", "/auth/otp/request", { phone }),
  otpVerify: (phone: string, code: string) => api<{ id: string; name: string; role: Role; tenantId: string | null }>("POST", "/auth/otp/verify", { phone, code }),
  login: (email: string, password: string) => api<{ id: string; name: string; role: Role }>("POST", "/auth/login", { email, password }),
  logout: () => api<{ ok: true }>("POST", "/auth/logout", {}),

  // customers
  customers: (q: { q?: string; tag?: string; cursor?: string; limit?: number } = {}) => api<{ items: CustomerRow[]; nextCursor: string | null; total?: number }>("GET", `/customers${qs(q)}`),
  customer: (id: string) => api<CustomerFull>("GET", `/customers/${id}`),
  createCustomer: (b: CustomerInput & { name: string; phone: string }) => api<CustomerRow>("POST", "/customers", b),
  updateCustomer: (id: string, b: CustomerInput) => api<CustomerRow>("PATCH", `/customers/${id}`, b),
  archiveCustomer: (id: string) => api<{ ok: true }>("DELETE", `/customers/${id}`),
  addVisit: (id: string, v: { at: string; service: string; category?: string; staffName?: string; price?: number; note?: string }) => api<Visit>("POST", `/customers/${id}/visits`, v),
  deleteVisit: (id: string, visitId: string) => api<{ ok: true }>("DELETE", `/customers/${id}/visits/${visitId}`),
  importCustomers: (rows: { name: string; phone: string }[]) => api<{ created: number; skipped: { row: number; phone: string; reason: string }[] }>("POST", "/customers/import", { rows }),

  // staff
  staff: (all = false) => api<Staff[]>("GET", `/staff${all ? "?all=1" : ""}`),
  staffMember: (id: string) => api<StaffFull>("GET", `/staff/${id}`),
  createStaff: (b: StaffInput & { name: string }) => api<Staff>("POST", "/staff", b),
  updateStaff: (id: string, b: StaffInput) => api<Staff>("PATCH", `/staff/${id}`, b),
  deactivateStaff: (id: string) => api<{ ok: true }>("DELETE", `/staff/${id}`),
  addLeave: (id: string, l: { fromDate: string; toDate: string; reason?: string }) => api<Leave>("POST", `/staff/${id}/leaves`, l),
  deleteLeave: (id: string, leaveId: string) => api<{ ok: true }>("DELETE", `/staff/${id}/leaves/${leaveId}`),
  inviteStaff: (id: string, phone: string) => api<{ loginPhone: string }>("POST", `/staff/${id}/invite`, { phone }),

  // services
  services: (q: { category?: string; active?: boolean } = {}) => api<Service[]>("GET", `/services${qs({ category: q.category, active: q.active === undefined ? undefined : q.active ? "1" : "0" })}`),
  createService: (b: ServiceInput & { category: string; name: string; price: number; durationMin: number }) => api<Service>("POST", "/services", b),
  updateService: (id: string, b: ServiceInput) => api<Service>("PATCH", `/services/${id}`, b),
  archiveService: (id: string) => api<{ ok: true }>("DELETE", `/services/${id}`),

  // calendar
  calSettings: () => api<CalSettings>("GET", "/calendar/settings"),
  saveCalSettings: (b: Partial<CalSettings>) => api<CalSettings>("PUT", "/calendar/settings", b),
  availability: (q: { serviceId: string; date: string; staffId?: string }) => api<Availability>("GET", `/calendar/availability${qs(q)}`),
  appointment: (id: string) => api<Appt>("GET", `/calendar/appointments/${id}`),
  appointments: (q: { date?: string; from?: string; to?: string; staffId?: string; status?: ApptStatus; customerId?: string }) => api<Appt[]>("GET", `/calendar/appointments${qs(q)}`),
  createAppt: (b: { customerId: string; staffId: string; serviceId: string; date: string; startMin: number; note?: string; status?: "PENDING" | "CONFIRMED" }) => api<Appt>("POST", "/calendar/appointments", b),
  confirmAppt: (id: string) => api<Appt>("POST", `/calendar/appointments/${id}/confirm`, {}),
  setApptStatus: (id: string, status: "CONFIRMED" | "IN_SERVICE" | "DONE" | "NO_SHOW") => api<Appt>("POST", `/calendar/appointments/${id}/status`, { status }),
  cancelAppt: (id: string, reason = "") => api<Appt>("POST", `/calendar/appointments/${id}/cancel`, { reason }),
  moveAppt: (id: string, to: { date: string; startMin: number; staffId?: string }) => api<Appt>("POST", `/calendar/appointments/${id}/move`, to),
  waitlist: () => api<WaitEntry[]>("GET", "/calendar/waitlist"),
  addWait: (w: { name: string; phone: string; serviceId: string; staffId?: string | null; fromDate: string; toDate: string; note?: string }) => api<WaitEntry>("POST", "/calendar/waitlist", w),
  cancelWait: (id: string) => api<{ ok: true }>("DELETE", `/calendar/waitlist/${id}`),
  bookFromWait: (id: string, s: { staffId: string; date: string; startMin: number }) => api<Appt>("POST", `/calendar/waitlist/${id}/book`, s),

  // cashier
  sales: (q: { date?: string; from?: string; to?: string; customerId?: string; status?: SaleStatus }) => api<SaleView[]>("GET", `/cashier/sales${qs(q)}`),
  createSale: (b: { customerId?: string | null; customerName?: string; apptId?: string | null; lines: SaleLineIn[]; discountPct: number; payments: { method: PayMethod; amount: number }[]; note?: string }) => api<SaleView>("POST", "/cashier/sales", b),
  voidSale: (id: string, reason: string) => api<SaleView>("POST", `/cashier/sales/${id}/void`, { reason }),
  expenses: (from: string, to?: string) => api<ExpenseView[]>("GET", `/cashier/expenses${qs({ from, to })}`),
  addExpense: (e: { title: string; amount: number; method: "CASH" | "CARD"; category?: string; date?: string }) => api<ExpenseView>("POST", "/cashier/expenses", e),
  deleteExpense: (id: string) => api<{ ok: true }>("DELETE", `/cashier/expenses/${id}`),
  debts: () => api<DebtRow[]>("GET", "/cashier/debts"),
  payDebt: (b: { customerId: string; amount: number; method: PayMethod }) => api<{ remainingDebt: number; settledInvoices: number }>("POST", "/cashier/debts/pay", b),
  summary: (from: string, to?: string) => api<Summary>("GET", `/cashier/summary${qs({ from, to })}`),
  day: (date: string) => api<DayStatus>("GET", `/cashier/days/${date}`),
  closeDay: (date: string, countedCash: number, note = "") => api<DayStatus>("POST", `/cashier/days/${date}/close`, { countedCash, note }),
  reopenDay: (date: string) => api<DayStatus>("DELETE", `/cashier/days/${date}/close`),

  // public booking (no login)
  publicSalon: (slug: string) => api<PublicSalon>("GET", `/public/salons/${encodeURIComponent(slug)}`),
  publicAvailability: (slug: string, q: { serviceId: string; date: string; staffId?: string }) => api<Availability>("GET", `/public/salons/${encodeURIComponent(slug)}/availability${qs(q)}`),
  publicBook: (slug: string, b: { serviceId: string; staffId?: string; date: string; startMin: number; name: string; phone: string; note?: string }) => api<Receipt>("POST", `/public/salons/${encodeURIComponent(slug)}/appointments`, b),
  publicWait: (slug: string, w: { name: string; phone: string; serviceId: string; staffId?: string | null; fromDate: string; toDate: string; note?: string }) => api<{ id: string }>("POST", `/public/salons/${encodeURIComponent(slug)}/waitlist`, w),
};
