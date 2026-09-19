"use client";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { useDB } from "@/lib/db";

export function BookGate({ children }: { children: ReactNode }) {
  const { salon } = useDB();
  if (salon.online.enabled) return <>{children}</>;
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-lg font-extrabold">رزرو آنلاین موقتاً بسته است</h1>
      <p className="mt-2 text-sm leading-7 text-ink2">برای گرفتن نوبت لطفاً با سالن تماس بگیرید:<br /><bdi dir="ltr" className="font-bold text-ink">{salon.phone}</bdi></p>
    </Card>
  );
}
