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

export type RealMethod = "CASH" | "CARD" | "ONLINE";
export type PayMethod = RealMethod | "WALLET";
export type SaleStatus = "PAID" | "DEBT" | "VOID";
export type SaleLineIn = { kind: "SERVICE" | "PRODUCT" | "OTHER"; refId?: string | null; name: string; qty: number; price: number; staffId?: string | null; commissionPct?: number };
export type SaleView = {
  id: string; number: number; code: string; date: string; customerId: string | null; customerName: string; apptId: string | null;
  subtotal: number; discountPct: number; discount: number; total: number; paid: number; debt: number; status: SaleStatus; note: string; voidReason: string | null; createdAt: string;
  lines: (SaleLineIn & { id: string })[]; payments: { method: PayMethod; amount: number; ref: string }[];
};
export type ExpenseView = { id: string; date: string; title: string; amount: number; method: RealMethod; category: string };
export type DebtRow = { customerId: string; name: string; phone: string; debt: number; invoices: number; since: string | null };
export type Summary = { from: string; to: string; count: number; revenue: number; services: number; products: number; discounts: number; cash: number; card: number; online: number; wallet: number; newDebt: number; debtCollected: number; expenses: number; net: number; cashExpected: number; byStaff: { staffId: string; name: string; revenue: number; commission: number }[] };
export type SmsKind = "MANUAL" | "CONFIRM" | "MOVED" | "CANCEL" | "REMINDER_24" | "REMINDER_2" | "THANKS" | "BIRTHDAY" | "CAMPAIGN" | "REVIEW";
export type SmsAccount = { balance: number; lowThreshold: number; low: boolean; pricing: { sell: number } };
export type SmsPackage = { id: string; name: string; price: number; bonusPct: number; active: boolean };
export type SmsScenario = { kind: Exclude<SmsKind, "MANUAL">; title: string; vars: string[]; enabled: boolean; template: string; custom: boolean };
export type SmsMessage = { id: string; customerId: string | null; phone: string; text: string; parts: number; cost: number; kind: SmsKind; status: "QUEUED" | "SENT" | "FAILED" | "BLOCKED"; reason: string | null; createdAt: string };
export type SmsTxRow = { id: string; delta: number; balanceAfter: number; kind: "TOPUP" | "BONUS" | "SEND" | "REFUND" | "ADJUST"; note: string; createdAt: string };
export type SmsStats = { days: number; sent: number; failed: number; blocked: number; parts: number; spend: number; byKind: Record<string, number> };
import type { Config as LoyaltyConfig } from "@/server/modules/loyalty/rules";
export type { LoyaltyConfig };
export type LoyaltyTxKind = "EARN" | "EARN_REVERSE" | "REDEEM" | "ADJUST" | "CASHBACK" | "CASHBACK_REVERSE" | "REWARD_CREDIT" | "WALLET_SPEND" | "WALLET_REFUND" | "WALLET_ADJUST" | "REFERRAL";
export type LoyaltyState = { customerId: string; name: string; points: number; lifetime: number; wallet: number; tier: string; off: number; next: { left: number; label: string }; log: { id: string; kind: LoyaltyTxKind; points: number; wallet: number; note: string; createdAt: string }[] };
export type LoyaltyMember = { customerId: string; name: string; phone?: string; tier: string; points: number; lifetime: number; wallet: number };
export type LoyaltyOverview = { members: number; points: number; walletTotal: number; tiers: Record<string, number>; top: LoyaltyMember[] };
export type Dashboard = {
  date: string; revenue: number; invoices: number; products: number; commission: number; deltaVsLastWeek: number | null;
  appointments: { total: number; done: number; pending: number };
  load: { capacity: number; booked: number; pct: number; freeHours: number };
  customers: { new: number; returning: number };
  week: { date: string; revenue: number }[];
  services: { name: string; share: number; margin: number }[];
  topStaff: { staffId: string; name: string; revenue: number; commission: number }[];
  month: { revenue: number; net: number };
  opportunities: { inactiveCustomers: number; pendingAppointments: number; debt: number };
};
export type ModuleEnt = { id: string; name: string; category: string; scope: string; price: number; addonPurchasable: boolean; version: string; enabled: boolean; minPlan: string | null; available: boolean; source: "plan" | "addon" | null; installed: boolean; active: boolean; blockedBy: string[] };
export type Entitlements = { tenantId: string; plan: { code: string; title: string } | null; subscriptionActive: boolean; modules: ModuleEnt[] };
export type TenantProfile = { id: string; name: string; slug: string; city: string; subscription: { planCode: string; planTitle: string; priceMonthly: number; status: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELED"; startedAt: string; expiresAt: string | null } | null };
export type PlanInfo = { code: string; title: string; tagline: string; priceMonthly: number; limits: Record<string, number | boolean>; moduleIds: string[] };
export type PaymentRow = { id: string; kind: string; planCode: string | null; moduleId: string | null; months: number; amount: number; status: "PENDING" | "PAID" | "FAILED" | "CANCELED"; refId: string | null; description: string; createdAt: string; paidAt: string | null };
export type SalonUser = { id: string; name: string; phone: string | null; role: Role; active: boolean; createdAt: string; staff: { id: string; name: string } | null };
export type ProductKind = "RETAIL" | "CONSUMABLE";
export type Product = { id: string; name: string; kind: ProductKind; price: number; cost: number; stock: number; reorder: number; supplier: string; low: boolean };
export type ProductInput = Partial<Pick<Product, "name" | "kind" | "price" | "cost" | "reorder" | "supplier">> & { stock?: number };
export type StockMoveRow = { id: string; kind: "RECEIVE" | "SALE" | "SALE_VOID" | "ADJUST"; delta: number; stockAfter: number; unitCost: number | null; note: string; createdAt: string };
export type InventoryOverview = { items: number; low: number; value: number; suppliers: number };
export type CampaignSegment = { inactiveDays?: number; tiers?: string[]; birthdayMonth?: boolean; minSpend?: number; service?: string };
export type CampaignPreview = { count: number; tooMany: boolean; sample: string[]; cost: number; balance: number; enough: boolean; text: string };
export type CampaignRow = { id: string; name: string; message: string; segment: CampaignSegment; status: "SCHEDULED" | "SENDING" | "SENT" | "CANCELED"; scheduledFor: string | null; sentAt: string | null; audienceCount: number; sentCount: number; failedCount: number; skippedCount: number; createdAt: string; revenue?: number; buyers?: number };
export type ReviewRow = { id: string; rating: number | null; comment: string; route: "PUBLIC" | "PRIVATE" | null; resolved: boolean; reply: string | null; repliedAt: string | null; serviceName: string; staffId: string | null; staffName: string | null; customerName: string | null; createdAt: string; answeredAt: string | null };
export type ReviewOverview = { answered: number; avg: number; dist: number[]; publicCount: number; openPrivate: number; pending: number; byStaff: { staffId: string; name: string; n: number; avg: number }[] };
export type PublicReview = { salon: string; serviceName: string; staffName: string | null; answered: boolean; rating: number | null; threshold: number };
export type ReferralConfig = { enabled: boolean; referrerPts: number; friendOff: number };
export type ReferralState = { customerId: string; code: string; enabled: boolean; friends: number; rewardedFriends: number; pointsEarned: number; referredBy: { id: string; name: string } | null; friendOffer: number };
export type ReferralOverview = { referred: number; converted: number; top: { customerId: string; name: string; friends: number; rewarded: number }[]; rows: { friendId: string; friend: string; referrerId: string; referrer: string; rewarded: boolean; points: number; at: string }[] };
export type MembershipPlan = { id: string; name: string; price: number; months: number; credits: number; creditLabel: string; discountPct: number; perks: string[]; active: boolean };
export type MembershipRow = { id: string; customerId: string; customerName?: string; planName: string; discountPct: number; startDate: string; expiryDate: string; credits: number; creditsTotal: number; creditLabel: string; status: "ACTIVE" | "EXPIRED" | "CANCELED"; saleId: string | null };
export type MembershipOverview = { activeMembers: number; mrr: number; sessionsLeft: number; plans: number };
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
  payDebt: (b: { customerId: string; amount: number; method: RealMethod }) => api<{ remainingDebt: number; settledInvoices: number }>("POST", "/cashier/debts/pay", b),
  summary: (from: string, to?: string) => api<Summary>("GET", `/cashier/summary${qs({ from, to })}`),
  day: (date: string) => api<DayStatus>("GET", `/cashier/days/${date}`),
  closeDay: (date: string, countedCash: number, note = "") => api<DayStatus>("POST", `/cashier/days/${date}/close`, { countedCash, note }),
  reopenDay: (date: string) => api<DayStatus>("DELETE", `/cashier/days/${date}/close`),

  // salon profile & subscription
  tenant: () => api<TenantProfile>("GET", "/tenant"),
  patchTenant: (b: { name?: string; city?: string }) => api<TenantProfile>("PATCH", "/tenant", b),
  plans: () => api<PlanInfo[]>("GET", "/platform/plans"),
  payPlan: (planCode: string, months: number) => api<{ paymentUrl: string }>("POST", "/tenant/payments", { kind: "plan", planCode, months }),
  payments: () => api<PaymentRow[]>("GET", "/tenant/payments"),

  tenantUsers: () => api<SalonUser[]>("GET", "/tenant/users"),
  setUserActive: (id: string, active: boolean) => api<{ id: string; active: boolean }>("PATCH", `/tenant/users/${id}`, { active }),

  // memberships
  membershipPlans: (activeOnly = false) => api<MembershipPlan[]>("GET", `/memberships/plans${activeOnly ? "?active=1" : ""}`),
  createMembershipPlan: (b: Omit<MembershipPlan, "id">) => api<MembershipPlan>("POST", "/memberships/plans", b),
  updateMembershipPlan: (id: string, b: Partial<Omit<MembershipPlan, "id">>) => api<MembershipPlan>("PATCH", `/memberships/plans/${id}`, b),
  archiveMembershipPlan: (id: string) => api<{ ok: true }>("DELETE", `/memberships/plans/${id}`),
  memberships: (q: { status?: string; customerId?: string } = {}) => api<MembershipRow[]>("GET", `/memberships${qs(q)}`),
  membershipOverview: () => api<MembershipOverview>("GET", "/memberships/overview"),
  membershipOf: (customerId: string) => api<{ membership: MembershipRow | null; discountPct: number }>("GET", `/memberships/customers/${customerId}`),
  sellMembership: (b: { customerId: string; planId: string; payments: { method: PayMethod; amount: number }[] }) => api<{ membership: MembershipRow; renewed: boolean; saleNumber: number }>("POST", "/memberships/sell", b),
  useMembership: (id: string, note = "") => api<MembershipRow>("POST", `/memberships/${id}/use`, { note }),
  cancelMembership: (id: string) => api<{ ok: true }>("POST", `/memberships/${id}/cancel`, {}),

  // referral
  referralConfig: () => api<ReferralConfig>("GET", "/referral/config"),
  putReferralConfig: (c: ReferralConfig) => api<ReferralConfig>("PUT", "/referral/config", c),
  referralOverview: () => api<ReferralOverview>("GET", "/referral/overview"),
  referralCustomer: (id: string) => api<ReferralState>("GET", `/referral/customers/${id}`),

  // reviews
  reviews: (q: { route?: "PUBLIC" | "PRIVATE"; status?: "answered" | "pending" } = {}) => api<ReviewRow[]>("GET", `/reviews${qs(q)}`),
  reviewOverview: () => api<ReviewOverview>("GET", "/reviews/overview"),
  reviewConfig: () => api<{ threshold: number }>("GET", "/reviews/config"),
  putReviewConfig: (threshold: number) => api<{ threshold: number }>("PUT", "/reviews/config", { threshold }),
  replyReview: (id: string, text: string) => api<ReviewRow>("POST", `/reviews/${id}/reply`, { text }),
  resolveReview: (id: string, resolved: boolean) => api<ReviewRow>("POST", `/reviews/${id}/${resolved ? "resolve" : "reopen"}`, {}),
  publicReview: (token: string) => api<PublicReview>("GET", `/public/reviews/${encodeURIComponent(token)}`),
  answerReview: (token: string, b: { rating: number; comment: string }) => api<{ route: "PUBLIC" | "PRIVATE"; thanks: string }>("POST", `/public/reviews/${encodeURIComponent(token)}`, b),

  // campaigns
  campaigns: () => api<CampaignRow[]>("GET", "/campaigns"),
  campaignPreview: (segment: CampaignSegment, message: string) => api<CampaignPreview>("POST", "/campaigns/preview", { segment, message }),
  createCampaign: (b: { name: string; message: string; segment: CampaignSegment; sendAt?: { date: string; minute: number } }) => api<CampaignRow>("POST", "/campaigns", b),
  cancelCampaign: (id: string) => api<{ ok: true }>("DELETE", `/campaigns/${id}`),

  // inventory
  products: (q: { kind?: ProductKind; low?: "1" } = {}) => api<Product[]>("GET", `/inventory/products${qs(q)}`),
  inventoryOverview: () => api<InventoryOverview>("GET", "/inventory/overview"),
  createProduct: (b: ProductInput) => api<Product>("POST", "/inventory/products", b),
  updateProduct: (id: string, b: ProductInput) => api<Product>("PATCH", `/inventory/products/${id}`, b),
  archiveProduct: (id: string) => api<{ ok: true }>("DELETE", `/inventory/products/${id}`),
  receiveStock: (id: string, b: { qty: number; unitCost?: number; note?: string }) => api<Product>("POST", `/inventory/products/${id}/receive`, b),
  adjustStock: (id: string, b: { stock: number; note: string }) => api<Product>("POST", `/inventory/products/${id}/adjust`, b),
  stockMoves: (id: string) => api<StockMoveRow[]>("GET", `/inventory/products/${id}/moves`),

  // modules
  entitlements: () => api<Entitlements>("GET", "/tenant/modules"),
  installModule: (id: string) => api<{ ok: true }>("POST", `/tenant/modules/${id}/install`, {}),
  uninstallModule: (id: string) => api<{ ok: true }>("POST", `/tenant/modules/${id}/uninstall`, {}),
  payAddon: (moduleId: string, months = 1) => api<{ paymentUrl: string }>("POST", "/tenant/payments", { kind: "addon", moduleId, months }),

  // dashboard
  dashboard: () => api<Dashboard>("GET", "/reports/dashboard"),

  // sms
  smsAccount: () => api<SmsAccount>("GET", "/sms/account"),
  smsSetThreshold: (lowThreshold: number) => api<SmsAccount>("PATCH", "/sms/account", { lowThreshold }),
  smsPackages: () => api<SmsPackage[]>("GET", "/sms/packages"),
  smsTopup: (packageId: string) => api<{ paymentId: string; amount: number; paymentUrl: string }>("POST", "/sms/topup", { packageId }),
  smsSend: (b: { customerId?: string | null; phone?: string; text: string }) => api<{ status: string }>("POST", "/sms/send", b),
  smsMessages: (q: { status?: string; limit?: number } = {}) => api<SmsMessage[]>("GET", `/sms/messages${qs(q)}`),
  smsTransactions: () => api<SmsTxRow[]>("GET", "/sms/transactions"),
  smsStats: (days = 30) => api<SmsStats>("GET", `/sms/stats${qs({ days })}`),
  smsScenarios: () => api<SmsScenario[]>("GET", "/sms/scenarios"),
  smsPutScenario: (kind: string, p: { enabled?: boolean; template?: string }) => api<SmsScenario>("PUT", `/sms/scenarios/${kind.toLowerCase()}`, p),

  // loyalty
  loyaltyConfig: () => api<LoyaltyConfig>("GET", "/loyalty/config"),
  loyaltyPutConfig: (c: LoyaltyConfig) => api<LoyaltyConfig>("PUT", "/loyalty/config", c),
  loyaltyOverview: () => api<LoyaltyOverview>("GET", "/loyalty/overview"),
  loyaltyMembers: (sort: "points" | "wallet" | "lifetime" = "points") => api<LoyaltyMember[]>("GET", `/loyalty/members${qs({ sort, limit: 100 })}`),
  loyaltyCustomer: (id: string) => api<LoyaltyState>("GET", `/loyalty/customers/${id}`),
  loyaltyRedeem: (id: string, rewardId: string) => api<{ state: LoyaltyState }>("POST", `/loyalty/customers/${id}/redeem`, { rewardId }),
  loyaltyAdjust: (id: string, b: { points?: number; wallet?: number; note: string }) => api<LoyaltyState>("POST", `/loyalty/customers/${id}/adjust`, b),

  // public booking (no login)
  publicSalon: (slug: string) => api<PublicSalon>("GET", `/public/salons/${encodeURIComponent(slug)}`),
  publicAvailability: (slug: string, q: { serviceId: string; date: string; staffId?: string }) => api<Availability>("GET", `/public/salons/${encodeURIComponent(slug)}/availability${qs(q)}`),
  publicBook: (slug: string, b: { serviceId: string; staffId?: string; date: string; startMin: number; name: string; phone: string; note?: string; ref?: string }) => api<Receipt>("POST", `/public/salons/${encodeURIComponent(slug)}/appointments`, b),
  publicWait: (slug: string, w: { name: string; phone: string; serviceId: string; staffId?: string | null; fromDate: string; toDate: string; note?: string }) => api<{ id: string }>("POST", `/public/salons/${encodeURIComponent(slug)}/waitlist`, w),
};
