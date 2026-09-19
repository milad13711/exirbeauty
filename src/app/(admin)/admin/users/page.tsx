import { AdminUsers } from "@/components/UsersManager";
import { PageTitle } from "@/components/ui";

export default function AdminUsersPage() {
  return (<><PageTitle title="کاربران ادمین" sub="اعضای تیم اکسیر که به این پنل دسترسی دارند" /><AdminUsers /></>);
}
