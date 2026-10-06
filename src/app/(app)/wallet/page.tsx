import { redirect } from "next/navigation";

// Wallet balances and cashback settings now live in the club page.
export default function WalletPage() {
  redirect("/loyalty");
}
