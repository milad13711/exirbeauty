// Zarinpal v4 gateway. Sandbox: https://sandbox.zarinpal.com (any 36-char UUID works as merchant id).

export type VerifyResult = { code: number; refId?: string; cardPan?: string };
export interface ZarinpalClient {
  request(i: { amount: number; description: string; callbackUrl: string; mobile?: string }): Promise<{ authority: string }>;
  verify(i: { authority: string; amount: number }): Promise<VerifyResult>;
  startUrl(authority: string): string;
}

let override: ZarinpalClient | null = null;
export const setZarinpalClient = (c: ZarinpalClient | null) => { override = c; };

const sandbox = () => process.env.ZARINPAL_SANDBOX !== "false";
const host = () => (sandbox() ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com");
const merchant = () => {
  const m = process.env.ZARINPAL_MERCHANT_ID;
  if (!m) throw new Error("ZARINPAL_MERCHANT_ID is not set");
  return m;
};

async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${host()}/pg/v4/payment/${path}.json`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ merchant_id: merchant(), ...body }),
    signal: AbortSignal.timeout(15_000),
  });
  // On success `errors` is [] and `data` is an object; on failure `data` is [] and `errors` is {code,message}.
  return (await res.json().catch(() => ({}))) as Envelope;
}

type Envelope = { data?: Record<string, unknown> | unknown[]; errors?: { code?: number; message?: string } | unknown[] };

/** Success: data = {code, ref_id, card_pan}. Failure: data is [] or {} and the code lives in errors. */
export function parseVerify(r: Envelope): VerifyResult {
  const d = r.data && !Array.isArray(r.data) ? r.data : undefined;
  if (d && typeof d.code === "number") return { code: d.code, refId: d.ref_id != null ? String(d.ref_id) : undefined, cardPan: typeof d.card_pan === "string" ? d.card_pan : undefined };
  const e = r.errors && !Array.isArray(r.errors) ? r.errors : undefined;
  return { code: typeof e?.code === "number" ? e.code : -1 };
}

const real: ZarinpalClient = {
  async request({ amount, description, callbackUrl, mobile }) {
    const r = await post("request", { amount, currency: "IRT", description, callback_url: callbackUrl, ...(mobile ? { metadata: { mobile } } : {}) });
    const d = r.data as Record<string, unknown> | undefined;
    if (!d || Array.isArray(d) || d.code !== 100 || typeof d.authority !== "string") {
      const e = r.errors as { code?: number; message?: string } | undefined;
      throw new Error(`Zarinpal request failed: ${e?.code ?? "?"} ${e?.message ?? ""}`);
    }
    return { authority: d.authority };
  },
  async verify({ authority, amount }) {
    return parseVerify(await post("verify", { authority, amount }));
  },
  startUrl: (authority) => `${host()}/pg/StartPay/${authority}`,
};

export const zarinpal = (): ZarinpalClient => override ?? real;
