import { mkdir } from "fs/promises";
import type { BrowserContext, Page } from "playwright";

import type { GeneratedImagePayload, ImageGenerationRequest } from "@/lib/image-generation";
import { getChatGPTWebRuntimeConfig, type ChatGPTWebRuntimeConfig } from "@/lib/settings";

export type ChatGPTWebErrorCode =
  | "CHATGPT_WEB_DISABLED"
  | "CHATGPT_WEB_LOGIN_REQUIRED"
  | "CHATGPT_WEB_TIMEOUT"
  | "CHATGPT_WEB_NO_IMAGE_FOUND"
  | "CHATGPT_WEB_BROWSER_FAILED";

export class ChatGPTWebError extends Error {
  code: ChatGPTWebErrorCode;

  constructor(code: ChatGPTWebErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = "ChatGPTWebError";
    this.code = code;
  }
}

export type ChatGPTWebStatus = {
  enabled: boolean;
  ready: boolean;
  userDataDir: string;
  headless: boolean;
  timeoutSeconds: number;
  message: string;
};

type ExtractedImage = {
  base64: string;
  mimeType: string;
};

let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

function assertEnabled(config: ChatGPTWebRuntimeConfig) {
  if (!config.enabled) {
    throw new ChatGPTWebError("CHATGPT_WEB_DISABLED", "后台未启用 ChatGPT Web 本机浏览器通道。");
  }
}

function normalizeMimeType(value: string): GeneratedImagePayload["mimeType"] {
  if (value.includes("jpeg") || value.includes("jpg")) {
    return "image/jpeg";
  }

  if (value.includes("webp")) {
    return "image/webp";
  }

  return "image/png";
}

function buildPrompt(request: ImageGenerationRequest) {
  const prompt = (request.promptZh || request.promptEn || "").trim();
  if (!prompt) {
    throw new Error("请输入生图提示词。");
  }

  const parts = [
    "请根据下面的描述直接生成图片，不要只回复文字。",
    `画面描述：${prompt}`,
    request.promptEn?.trim() ? `英文参考提示词：${request.promptEn.trim()}` : "",
    request.negativePrompt?.trim() ? `需要避免：${request.negativePrompt.trim()}` : "",
    `画面比例：${request.ratio || "1:1"}`,
    `质量要求：${request.quality || "standard"}`,
    `张数：${Math.min(Math.max(Math.floor(Number(request.imageCount || 1)), 1), 4)} 张`,
  ];

  return parts.filter(Boolean).join("\n");
}

async function launchPersistentContext(config: ChatGPTWebRuntimeConfig, forceHeaded = false) {
  await mkdir(config.userDataDir, { recursive: true });
  const { chromium } = await import("playwright");
  const headless = forceHeaded ? false : config.headless;
  const args = ["--disable-blink-features=AutomationControlled"];

  try {
    return await chromium.launchPersistentContext(config.userDataDir, {
      channel: "msedge",
      headless,
      args,
      viewport: { width: 1440, height: 1000 },
    });
  } catch {
    try {
      return await chromium.launchPersistentContext(config.userDataDir, {
        channel: "chrome",
        headless,
        args,
        viewport: { width: 1440, height: 1000 },
      });
    } catch {
      return chromium.launchPersistentContext(config.userDataDir, {
        headless,
        args,
        viewport: { width: 1440, height: 1000 },
      });
    }
  }
}

async function getSharedContext(config: ChatGPTWebRuntimeConfig, forceHeaded = false) {
  if (sharedContext) {
    return sharedContext;
  }

  try {
    sharedContext = await launchPersistentContext(config, forceHeaded);
    sharedContext.on("close", () => {
      sharedContext = null;
      sharedPage = null;
    });
    return sharedContext;
  } catch (error) {
    throw new ChatGPTWebError(
      "CHATGPT_WEB_BROWSER_FAILED",
      error instanceof Error ? error.message : "启动本机浏览器失败。",
    );
  }
}

async function getSharedPage(config: ChatGPTWebRuntimeConfig, forceHeaded = false) {
  const context = await getSharedContext(config, forceHeaded);

  if (sharedPage && !sharedPage.isClosed()) {
    return sharedPage;
  }

  sharedPage = context.pages()[0] || (await context.newPage());
  return sharedPage;
}

async function gotoChatGPT(page: Page, timeoutMs: number) {
  await page.goto("https://chatgpt.com/", {
    waitUntil: "domcontentloaded",
    timeout: Math.min(timeoutMs, 60000),
  });
}

async function isLoggedIn(page: Page) {
  const url = page.url();
  if (url.includes("auth.openai.com") || url.includes("/auth/login")) {
    return false;
  }

  const loginButtons = await page
    .locator('a[href*="/auth/login"], button:has-text("Log in"), button:has-text("登录"), button:has-text("Sign up")')
    .count()
    .catch(() => 0);

  if (loginButtons > 0) {
    return false;
  }

  const composerCount = await page
    .locator('textarea, div[contenteditable="true"], [data-testid="composer-root"]')
    .count()
    .catch(() => 0);

  return composerCount > 0;
}

async function getLargeImageSrcs(page: Page) {
  return page.evaluate(() => {
    const images = Array.from(document.querySelectorAll("main img")) as HTMLImageElement[];
    return images
      .filter((image) => image.naturalWidth >= 256 && image.naturalHeight >= 256 && image.src)
      .map((image) => image.src);
  });
}

async function findComposer(page: Page) {
  const selectors = [
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="消息"]',
    "textarea",
    'div[contenteditable="true"]',
    '[data-testid="composer-root"] div[contenteditable="true"]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).last();
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  const textbox = page.getByRole("textbox").last();
  if (await textbox.isVisible().catch(() => false)) {
    return textbox;
  }

  throw new ChatGPTWebError("CHATGPT_WEB_BROWSER_FAILED", "没有找到 ChatGPT 输入框，可能是页面结构已变化。");
}

async function submitPrompt(page: Page, prompt: string) {
  const composer = await findComposer(page);
  await composer.click();

  const tagName = await composer.evaluate((node) => node.tagName.toLowerCase()).catch(() => "");
  if (tagName === "textarea") {
    await composer.fill(prompt);
  } else {
    await page.keyboard.insertText(prompt);
  }

  const sendButtonSelectors = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="发送"]',
  ];

  for (const selector of sendButtonSelectors) {
    const button = page.locator(selector).last();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      return;
    }
  }

  await page.keyboard.press("Enter");
}

async function waitForGeneratedImages(page: Page, previousSrcs: string[], imageCount: number, timeoutMs: number) {
  try {
    await page.waitForFunction(
      ({ previous, expectedCount }) => {
        const previousSet = new Set(previous);
        const images = Array.from(document.querySelectorAll("main img")) as HTMLImageElement[];
        const generated = images.filter(
          (image) => image.naturalWidth >= 256 && image.naturalHeight >= 256 && image.src && !previousSet.has(image.src),
        );
        return generated.length >= expectedCount;
      },
      { previous: previousSrcs, expectedCount: imageCount },
      { timeout: timeoutMs },
    );
  } catch {
    throw new ChatGPTWebError("CHATGPT_WEB_TIMEOUT", "等待 ChatGPT 生成图片超时。");
  }
}

async function extractGeneratedImages(page: Page, previousSrcs: string[], imageCount: number) {
  const extracted = await page.evaluate(
    async ({ previous, count }) => {
      const previousSet = new Set(previous);
      const images = Array.from(document.querySelectorAll("main img")) as HTMLImageElement[];
      const candidates = images.filter(
        (image) => image.naturalWidth >= 256 && image.naturalHeight >= 256 && image.src && !previousSet.has(image.src),
      );
      const uniqueSrcs = Array.from(new Set(candidates.map((image) => image.src))).slice(-count);
      const output: Array<{ base64: string; mimeType: string }> = [];

      for (const src of uniqueSrcs) {
        const response = await fetch(src);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
          reader.onerror = () => reject(new Error("读取图片失败"));
          reader.readAsDataURL(blob);
        });

        if (base64) {
          output.push({
            base64,
            mimeType: blob.type || "image/png",
          });
        }
      }

      return output;
    },
    { previous: previousSrcs, count: imageCount },
  );

  return extracted as ExtractedImage[];
}

export async function openChatGPTWebLoginBrowser(): Promise<ChatGPTWebStatus> {
  const config = await getChatGPTWebRuntimeConfig();
  assertEnabled(config);

  const page = await getSharedPage(config, true);
  await gotoChatGPT(page, config.timeoutMs);
  await page.bringToFront().catch(() => null);
  const ready = await isLoggedIn(page);

  return {
    enabled: config.enabled,
    ready,
    userDataDir: config.userDataDir,
    headless: false,
    timeoutSeconds: Math.floor(config.timeoutMs / 1000),
    message: ready ? "ChatGPT 已登录，可以开始使用。" : "浏览器已打开，请先在页面中登录 ChatGPT。",
  };
}

export async function checkChatGPTWebStatus(): Promise<ChatGPTWebStatus> {
  const config = await getChatGPTWebRuntimeConfig();
  if (!config.enabled) {
    return {
      enabled: false,
      ready: false,
      userDataDir: config.userDataDir,
      headless: config.headless,
      timeoutSeconds: Math.floor(config.timeoutMs / 1000),
      message: "后台未启用 ChatGPT Web 本机浏览器通道。",
    };
  }

  const page = await getSharedPage(config);
  await gotoChatGPT(page, config.timeoutMs);
  const ready = await isLoggedIn(page);

  return {
    enabled: true,
    ready,
    userDataDir: config.userDataDir,
    headless: config.headless,
    timeoutSeconds: Math.floor(config.timeoutMs / 1000),
    message: ready ? "ChatGPT 已登录，可以生成图片。" : "ChatGPT 尚未登录，请先打开登录浏览器。",
  };
}

export async function generateWithChatGPTWeb(request: ImageGenerationRequest): Promise<GeneratedImagePayload[]> {
  const config = await getChatGPTWebRuntimeConfig();
  assertEnabled(config);

  const page = await getSharedPage(config);
  await gotoChatGPT(page, config.timeoutMs);

  if (!(await isLoggedIn(page))) {
    throw new ChatGPTWebError("CHATGPT_WEB_LOGIN_REQUIRED", "ChatGPT 尚未登录，请到后台打开登录浏览器并完成登录。");
  }

  const imageCount = Math.min(Math.max(Math.floor(Number(request.imageCount || 1)), 1), 4);
  const previousSrcs = await getLargeImageSrcs(page);
  await submitPrompt(page, buildPrompt(request));
  await waitForGeneratedImages(page, previousSrcs, imageCount, config.timeoutMs);

  const extracted = await extractGeneratedImages(page, previousSrcs, imageCount);
  if (!extracted.length) {
    throw new ChatGPTWebError("CHATGPT_WEB_NO_IMAGE_FOUND", "ChatGPT 页面没有检测到可保存的生成图片。");
  }

  return extracted.map((image) => ({
    buffer: Buffer.from(image.base64, "base64"),
    mimeType: normalizeMimeType(image.mimeType),
  }));
}
