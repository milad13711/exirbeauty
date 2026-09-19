const P = "۰۱۲۳۴۵۶۷۸۹", A = "٠١٢٣٤٥٦٧٨٩";
/** تبدیل ارقام فارسی و عربی به لاتین */
export const digits = (s: string) => s.replace(/[۰-۹]/g, (c) => String(P.indexOf(c))).replace(/[٠-٩]/g, (c) => String(A.indexOf(c)));
export const isPhone = (s: string) => /^09\d{9}$/.test(digits(s).replace(/\s|-/g, ""));
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
export const DEMO_OTP = "12345";
