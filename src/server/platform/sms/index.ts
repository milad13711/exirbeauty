export interface SmsGateway {
  send(to: string, text: string): Promise<void>;
}

let override: SmsGateway | null = null;
/** Tests inject a fake gateway here. */
export const setSmsGateway = (g: SmsGateway | null) => { override = g; };

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/** Limo SMS — https://api.limosms.com (header `ApiKey`, POST /api/sendsms). */
const limoSms: SmsGateway = {
  async send(to, text) {
    const res = await fetch("https://api.limosms.com/api/sendsms", {
      method: "POST",
      headers: { "content-type": "application/json", ApiKey: need("LIMOSMS_API_KEY") },
      body: JSON.stringify({ SenderNumber: need("LIMOSMS_SENDER"), Message: text, MobileNumber: [to], SendToBlocksNumber: false }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    // The API answers with camelCase today and documents PascalCase; accept both.
    const ok = body && (body.success ?? body.Success) === true;
    if (!res.ok || !ok) throw new Error(`LimoSMS send failed (${res.status}): ${String(body?.message ?? body?.Message ?? "no body")}`);
  },
};

/** Dev only: prints the message in the server log instead of sending (no credit spent). */
const consoleSms: SmsGateway = {
  async send(to, text) {
    if (process.env.NODE_ENV === "production") throw new Error("SMS_DRIVER=console is not allowed in production");
    console.log(`[sms:console] to=${to}\n${text}`);
  },
};

export function smsGateway(): SmsGateway {
  if (override) return override;
  return (process.env.SMS_DRIVER ?? "console") === "limosms" ? limoSms : consoleSms;
}
