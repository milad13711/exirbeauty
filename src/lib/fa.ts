const D = "۰۱۲۳۴۵۶۷۸۹";
export const fa = (n: number | string) =>
  String(n).replace(/\d/g, (d) => D[+d]);
export const num = (n: number) => fa(n.toLocaleString("en-US")).replace(/,/g, "٬");
/** تومان با جداکننده هزارگان */
export const toman = (n: number) => `${num(n)} تومان`;
/** خلاصه: میلیون / هزار */
export const short = (n: number) =>
  n >= 1_000_000
    ? `${fa((n / 1_000_000).toFixed(1).replace(/\.0$/, "").replace(".", "٫"))} میلیون`
    : `${fa(Math.round(n / 1000))} هزار`;
export const initials = (name: string) => name.trim().split(" ")[0].slice(0, 1);
