import { redirect } from "next/navigation";

// Automatic messages now live in the SMS module's "scenarios" tab.
export default function Automation() {
  redirect("/sms?tab=scenarios");
}
