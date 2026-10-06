import { afterEach, describe, expect, it, vi } from "vitest";
import { smsGateway } from "./index";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Limo SMS gateway", () => {
  const setup = (reply: unknown, status = 200) => {
    vi.stubEnv("SMS_DRIVER", "limosms"); vi.stubEnv("LIMOSMS_API_KEY", "KEY-123"); vi.stubEnv("LIMOSMS_SENDER", "2000000000");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(reply), { status }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("posts to /api/sendsms with the ApiKey header and the documented body", async () => {
    const f = setup({ success: true, message: "ok" });
    await smsGateway().send("09121234567", "سلام");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.limosms.com/api/sendsms");
    expect((init.headers as Record<string, string>).ApiKey).toBe("KEY-123");
    expect(JSON.parse(init.body as string)).toEqual({ SenderNumber: "2000000000", Message: "سلام", MobileNumber: ["09121234567"], SendToBlocksNumber: false });
  });

  it("accepts the PascalCase success flag the docs describe", async () => {
    setup({ Success: true, Message: "ok" });
    await expect(smsGateway().send("09121234567", "x")).resolves.toBeUndefined();
  });

  it("throws when the API reports failure, without leaking the key", async () => {
    setup({ success: false, message: "اعتبار کافی نیست" });
    const err = (await smsGateway().send("09121234567", "x").then(() => null, (e: Error) => e)) as Error;
    expect(err.message).toContain("اعتبار کافی نیست");
    expect(err.message).not.toContain("KEY-123");
  });

  it("throws on HTTP errors", async () => {
    setup({ success: true }, 500);
    await expect(smsGateway().send("09121234567", "x")).rejects.toThrow();
  });

  it("refuses the console driver in production", async () => {
    vi.stubEnv("SMS_DRIVER", "console"); vi.stubEnv("NODE_ENV", "production");
    await expect(smsGateway().send("09121234567", "x")).rejects.toThrow(/production/);
  });
});
