import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { closeChatGPTWebBrowser, generateWithChatGPTWeb } from "../src/lib/chatgpt-web";
import { loadChatGPTDevEnv } from "./chatgpt-dev-env";

function extensionForMimeType(mimeType: string) {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "jpg";
  }
  if (mimeType.includes("webp")) {
    return "webp";
  }
  return "png";
}

function readNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

async function main() {
  loadChatGPTDevEnv({ headless: true });

  const prompt = process.argv.slice(2).join(" ").trim();
  if (!prompt) {
    console.error("用法：npm run chatgpt:generate -- \"一张蓝白色产品海报\"");
    process.exit(1);
  }

  const ratio = process.env.CHATGPT_WEB_TEST_RATIO || "1:1";
  const quality = process.env.CHATGPT_WEB_TEST_QUALITY || "standard";
  const imageCount = readNumberEnv("CHATGPT_WEB_TEST_IMAGE_COUNT", 1);

  let images;
  try {
    images = await generateWithChatGPTWeb({
      promptZh: prompt,
      ratio,
      quality,
      imageCount,
    });
  } finally {
    await closeChatGPTWebBrowser();
  }

  const outputDir = path.resolve(process.cwd(), "output", "chatgpt-web");
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  for (const [index, image] of images.entries()) {
    const filePath = path.join(outputDir, `${timestamp}-${index + 1}.${extensionForMimeType(image.mimeType)}`);
    await writeFile(filePath, image.buffer);
    console.log(filePath);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
