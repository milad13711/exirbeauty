"use client";
import { api } from "./api";
import type { LoyaltyTxKind } from "./crmApi";

export type PortalMe = { id: string; name: string; phone: string; birthDate: string | null; salon: { name: string; slug: string; city: string }; features: { booking: boolean; loyalty: boolean; referral: boolean; memberships: boolean; giftcards: boolean } };
export type PortalAppt = { id: string; date: string; startMin: number; durationMin: number; status: "PENDING" | "CONFIRMED" | "IN_SERVICE" | "DONE" | "CANCELED" | "NO_SHOW"; serviceName: string; staffName: string; price: number; upcoming: boolean; canCancel: boolean };
export type PortalRewards = { points: number; lifetime: number; wallet: number; tier: string; off: number; next: { left: number; label: string }; log: { id: string; kind: LoyaltyTxKind; points: number; wallet: number; note: string; createdAt: string }[]; tiers: { name: string; from: number; off: number; perks: string }[]; rewards: { id: string; name: string; cost: number; kind: "wallet" | "free" | "product"; value: number }[] };
export type PortalWallet = { balance: number; log: PortalRewards["log"] };
export type PortalInvite = { code: string; enabled: boolean; friends: number; rewardedFriends: number; pointsEarned: number; referrerPts: number; friendOff: number; path: string };

export const portal = {
  requestCode: (slug: string, phone: string) => api<{ expiresIn: number }>("POST", `/portal/${encodeURIComponent(slug)}/otp/request`, { phone }),
  verify: (slug: string, b: { phone: string; code: string; name?: string; ref?: string }) => api<{ id: string; name: string }>("POST", `/portal/${encodeURIComponent(slug)}/otp/verify`, b),
  logout: () => api<{ ok: true }>("POST", "/portal/logout", {}),
  me: () => api<PortalMe>("GET", "/portal/me"),
  updateMe: (b: { name?: string; birthDate?: string | null }) => api<PortalMe>("PATCH", "/portal/me", b),
  appointments: () => api<{ cancelHours: number; items: PortalAppt[] }>("GET", "/portal/appointments"),
  cancel: (id: string) => api<{ ok: true }>("POST", `/portal/appointments/${id}/cancel`, {}),
  rewards: () => api<PortalRewards>("GET", "/portal/rewards"),
  redeem: (id: string) => api<{ wallet: number; points: number }>("POST", `/portal/rewards/${id}/redeem`, {}),
  wallet: () => api<PortalWallet>("GET", "/portal/wallet"),
  invite: () => api<PortalInvite>("GET", "/portal/invite"),
};
