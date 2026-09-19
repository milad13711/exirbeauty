import { NotificationList } from "@/components/NotificationList";
import { PageTitle } from "@/components/ui";

export default function AdminNotifications() {
  return (<><PageTitle title="اعلان‌ها" sub="سفارش‌های جدید، تیکت‌ها، ثبت‌نام سالن‌ها و پورسانت‌ها" /><NotificationList aud="admin" /></>);
}
