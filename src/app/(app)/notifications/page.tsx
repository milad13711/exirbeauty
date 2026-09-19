import { NotificationList } from "@/components/NotificationList";
import { PageTitle } from "@/components/ui";

export default function Notifications() {
  return (<><PageTitle title="اعلان‌ها" sub="نوبت‌های جدید، لغوها، بازخوردها و پاسخ پشتیبانی" /><NotificationList aud="salon" /></>);
}
