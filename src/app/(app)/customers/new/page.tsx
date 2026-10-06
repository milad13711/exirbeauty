"use client";
import { useRouter } from "next/navigation";
import { Card, PageTitle } from "@/components/ui";
import { LiveGate } from "@/components/live/LiveGate";
import { CustomerForm } from "@/components/live/CustomerForm";
import { crm } from "@/lib/crmApi";

export default function NewCustomer() {
  const router = useRouter();
  return (
    <LiveGate>
      <PageTitle title="مشتری جدید" sub="شماره‌ی موبایل در هر سالن یکتاست" />
      <Card className="max-w-2xl p-5">
        <CustomerForm submitLabel="ثبت مشتری" onCancel={() => router.back()} onSubmit={async (b) => { const c = await crm.createCustomer(b); router.push(`/customers/${c.id}`); }} />
      </Card>
    </LiveGate>
  );
}
