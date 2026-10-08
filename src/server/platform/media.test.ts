import { describe, expect, it } from "vitest";
import { MAX_BYTES, parseDataUrl } from "./media";

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(20, 1)]).toString("base64");
describe("media data URLs", () => {
  it("accepts a real PNG", () => { expect(parseDataUrl(`data:image/png;base64,${png}`).mime).toBe("image/png"); });
  it("rejects SVG and other types", () => {
    expect(() => parseDataUrl(`data:image/svg+xml;base64,${Buffer.from("<svg onload=alert(1)>").toString("base64")}`)).toThrow();
    expect(() => parseDataUrl(`data:text/html;base64,${png}`)).toThrow();
    expect(() => parseDataUrl("not a data url")).toThrow();
  });
  it("rejects bytes that don't match the claimed type", () => {
    expect(() => parseDataUrl(`data:image/jpeg;base64,${png}`)).toThrow(); // PNG bytes claiming JPEG
    expect(() => parseDataUrl(`data:image/png;base64,${Buffer.from("hello world, not a png").toString("base64")}`)).toThrow();
  });
  it("rejects oversized images", () => {
    const big = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(MAX_BYTES, 1)]).toString("base64");
    expect(() => parseDataUrl(`data:image/png;base64,${big}`)).toThrow();
  });
});
