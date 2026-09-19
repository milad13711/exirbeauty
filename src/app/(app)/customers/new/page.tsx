import { CustomerForm } from "@/components/CustomerForm";
import { PageTitle } from "@/components/ui";

export default function NewCustomer() {
  return (<><PageTitle title="مشتری جدید" sub="مشخصات اصلی را ثبت کنید؛ پرونده‌ی زیبایی را بعداً از صفحه‌ی مشتری تکمیل می‌کنید" /><CustomerForm /></>);
}
