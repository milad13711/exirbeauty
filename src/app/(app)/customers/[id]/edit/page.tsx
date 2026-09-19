import { CustomerForm } from "@/components/CustomerForm";
import { PageTitle } from "@/components/ui";

export default async function EditCustomer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (<><PageTitle title="ویرایش مشتری" /><CustomerForm id={id} /></>);
}
