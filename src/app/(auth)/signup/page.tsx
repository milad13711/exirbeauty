import { SignupWizard } from "@/components/SignupWizard";

export default function Signup() {
  return (
    <>
      <h1 className="mb-1 text-center text-2xl font-extrabold">شروع با اکسیر بیوتی</h1>
      <p className="mb-6 text-center text-sm text-ink2">در چند دقیقه سالن خود را راه‌اندازی کنید</p>
      <SignupWizard />
    </>
  );
}
