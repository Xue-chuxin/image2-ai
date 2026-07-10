import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { detectReferenceImageMimeType } from "@/lib/uploads";

async function makeImage(format: "png" | "jpeg" | "webp"): Promise<Buffer> {
  const base = sharp({
    create: {
      width: 16,
      height: 16,
      channels: 3,
      background: { r: 120, g: 80, b: 200 },
    },
  });
  if (format === "png") return base.png().toBuffer();
  if (format === "jpeg") return base.jpeg().toBuffer();
  return base.webp().toBuffer();
}

describe("detectReferenceImageMimeType", () => {
  it("以真实 magic-byte 识别 PNG", async () => {
    expect(await detectReferenceImageMimeType(await makeImage("png"))).toBe("image/png");
  });

  it("以真实 magic-byte 识别 JPEG", async () => {
    expect(await detectReferenceImageMimeType(await makeImage("jpeg"))).toBe("image/jpeg");
  });

  it("以真实 magic-byte 识别 WEBP", async () => {
    expect(await detectReferenceImageMimeType(await makeImage("webp"))).toBe("image/webp");
  });

  it("纯文本 buffer 抛错（非图片）", async () => {
    await expect(detectReferenceImageMimeType(Buffer.from("this is not an image"))).rejects.toThrow();
  });

  it("伪造成 .png 后缀的非图片 buffer 抛错（客户端 Content-Type 无效）", async () => {
    // 前几字节像 PNG 头但整体不是合法图片，magic-byte 加固应拒绝。
    const fake = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02, 0x03]);
    await expect(detectReferenceImageMimeType(fake)).rejects.toThrow();
  });
});
