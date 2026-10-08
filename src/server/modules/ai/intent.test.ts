import { describe, expect, it } from "vitest";
import { intentOf, pctChange } from "./intent";

describe("assistant intents", () => {
  it.each([
    ["چرا فروش این هفته کم شده؟", "sales_drop"], ["فردا ظرفیت خالی دارم؟", "capacity"], ["به چه مشتری‌هایی پیام بدهم", "outreach"],
    ["کدام خدمت سودآورتر است", "margin"], ["بدهی مشتریان چقدر است", "debt"], ["کدام کالاها تمام شده", "stock"],
    ["بهترین متخصص ما کیست", "staff"], ["فروش امروز چقدر بوده", "revenue"], ["سلام", "help"], ["هوا چطوره", "help"],
  ])("%s → %s", (q, i) => expect(intentOf(q).intent).toBe(i));
  it("reads 'tomorrow' and Arabic letters", () => {
    expect(intentOf("فردا ظرفيت خالي").day).toBe(1);
    expect(intentOf("ظرفیت امروز").day).toBe(0);
    expect(intentOf("چرا فروش افت کرده").intent).toBe("sales_drop"); // specific rule beats the generic "فروش"
  });
  it("computes percentage change, or null with no baseline", () => {
    expect(pctChange(150, 100)).toBe(50); expect(pctChange(50, 100)).toBe(-50); expect(pctChange(10, 0)).toBeNull();
  });
});
