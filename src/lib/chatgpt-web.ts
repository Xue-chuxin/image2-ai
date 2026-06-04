import { execFile } from "child_process";
import { access, mkdir } from "fs/promises";
import { promisify } from "util";
import type { BrowserContext, Locator, Page } from "playwright";

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

type ImageCandidate = {
  src: string;
  width: number;
  height: number;
};

let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

const CHATGPT_URL = "https://chatgpt.com/";
const execFileAsync = promisify(execFile);

const zh = {
  disabled: "\u540e\u53f0\u672a\u542f\u7528 ChatGPT Web \u672c\u673a\u6d4f\u89c8\u5668\u901a\u9053\u3002",
  noPrompt: "\u8bf7\u8f93\u5165\u751f\u56fe\u63d0\u793a\u8bcd\u3002",
  browserStartFailed: "\u542f\u52a8\u672c\u673a\u6d4f\u89c8\u5668\u5931\u8d25\u3002",
  noChrome: "\u672a\u68c0\u6d4b\u5230\u672c\u673a Google Chrome \u53ef\u6267\u884c\u6587\u4ef6\u3002",
  launchFailed: "\u6ca1\u6709\u542f\u52a8\u53ef\u7528\u7684 Google Chrome \u6216 Edge\u3002",
  pageNotNavigated: "Chrome \u5df2\u6253\u5f00\uff0c\u4f46\u6ca1\u6709\u8df3\u8f6c\u5230 ChatGPT\u3002",
  loginRequired: "ChatGPT \u5c1a\u672a\u767b\u5f55\uff0c\u8bf7\u5230\u540e\u53f0\u6253\u5f00\u767b\u5f55\u6d4f\u89c8\u5668\u5e76\u5b8c\u6210\u767b\u5f55\u3002",
  noComposer: "\u6ca1\u6709\u627e\u5230 ChatGPT \u8f93\u5165\u6846\uff0c\u8bf7\u786e\u8ba4\u9875\u9762\u5df2\u767b\u5f55\u5e76\u505c\u7559\u5728 ChatGPT \u9996\u9875\u3002",
  typeFailed: "\u627e\u5230\u4e86 ChatGPT \u8f93\u5165\u533a\uff0c\u4f46\u65e0\u6cd5\u5199\u5165\u63d0\u793a\u8bcd\u3002",
  sendFailed: "\u63d0\u793a\u8bcd\u5df2\u5199\u5165\uff0c\u4f46\u6ca1\u6709\u627e\u5230\u53ef\u7528\u7684\u53d1\u9001\u6309\u94ae\u3002",
  timeout: "\u7b49\u5f85 ChatGPT \u751f\u6210\u56fe\u7247\u8d85\u65f6\u3002",
  noImage: "ChatGPT \u9875\u9762\u6ca1\u6709\u68c0\u6d4b\u5230\u53ef\u4fdd\u5b58\u7684\u751f\u6210\u56fe\u7247\u3002",
  readImageFailed: "\u8bfb\u53d6\u56fe\u7247\u5931\u8d25",
  loggedIn: "ChatGPT \u5df2\u767b\u5f55\uff0c\u53ef\u4ee5\u5f00\u59cb\u4f7f\u7528\u3002",
  loginBrowserOpened: "\u6d4f\u89c8\u5668\u5df2\u6253\u5f00\uff0c\u8bf7\u5148\u5728\u9875\u9762\u4e2d\u767b\u5f55 ChatGPT\u3002",
  ready: "ChatGPT \u5df2\u767b\u5f55\uff0c\u53ef\u4ee5\u751f\u6210\u56fe\u7247\u3002",
  notEnabledStatus: "\u540e\u53f0\u672a\u542f\u7528 ChatGPT Web \u672c\u673a\u6d4f\u89c8\u5668\u901a\u9053\u3002",
};

function normalizeMimeType(value: string): GeneratedImagePayload["mimeType"] {
  if (value.includes("jpeg") || value.includes("jpg")) {
    return "image/jpeg";
  }

  if (value.includes("webp")) {
    return "image/webp";
  }

  return "image/png";
}

function normalizeCount(imageCount?: number) {
  return Math.min(Math.max(Math.floor(Number(imageCount || 1)), 1), 4);
}

function buildPrompt(request: ImageGenerationRequest) {
  const prompt = (request.promptZh || request.promptEn || "").trim();
  if (!prompt) {
    throw new Error(zh.noPrompt);
  }

  const parts = [
    "Please generate an image directly from the following brief. Do not reply with text only.",
    `Main brief: ${prompt}`,
    request.promptEn?.trim() ? `English reference prompt: ${request.promptEn.trim()}` : "",
    request.negativePrompt?.trim() ? `Avoid: ${request.negativePrompt.trim()}` : "",
    `Aspect ratio: ${request.ratio || "1:1"}`,
    `Quality: ${request.quality || "standard"}`,
    `Count: ${normalizeCount(request.imageCount)} image(s)`,
  ];

  return parts.filter(Boolean).join("\n");
}

function assertEnabled(config: ChatGPTWebRuntimeConfig) {
  if (!config.enabled) {
    throw new ChatGPTWebError("CHATGPT_WEB_DISABLED", zh.disabled);
  }
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findChromeExecutablePath() {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : "",
    process.platform === "win32" ? "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" : "",
    process.platform === "win32" && process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : "",
    process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "",
    process.platform === "linux" ? "/usr/bin/google-chrome" : "",
    process.platform === "linux" ? "/usr/bin/google-chrome-stable" : "",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function closeExistingProfileBrowsers(userDataDir: string) {
  if (process.platform !== "win32") {
    return;
  }

  const script = `
$profilePath = [System.IO.Path]::GetFullPath(${JSON.stringify(userDataDir)})
$target = $profilePath.TrimEnd('\\').Replace('/', '\\').ToLowerInvariant()
Get-CimInstance Win32_Process |
  Where-Object {
    ($_.Name -eq 'chrome.exe' -or $_.Name -eq 'msedge.exe') -and
    $_.CommandLine -and
    $_.CommandLine.Replace('/', '\\').ToLowerInvariant().Contains($target)
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
`;

  await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      timeout: 10000,
      windowsHide: true,
    },
  ).catch(() => null);
}

async function launchPersistentContext(config: ChatGPTWebRuntimeConfig, forceHeaded = false) {
  await mkdir(config.userDataDir, { recursive: true });
  await closeExistingProfileBrowsers(config.userDataDir);

  const { chromium } = await import("playwright");
  const headless = forceHeaded ? false : config.headless;
  const args = [
    "--disable-blink-features=AutomationControlled",
    "--disable-session-crashed-bubble",
    "--disable-restore-session-state",
  ];
  const chromeExecutablePath = await findChromeExecutablePath();
  const launchErrors: string[] = [];

  if (chromeExecutablePath) {
    try {
      return await chromium.launchPersistentContext(config.userDataDir, {
        executablePath: chromeExecutablePath,
        headless,
        args,
        viewport: { width: 1440, height: 1000 },
      });
    } catch (error) {
      launchErrors.push(`Chrome executable ${chromeExecutablePath} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    launchErrors.push(zh.noChrome);
  }

  try {
    return await chromium.launchPersistentContext(config.userDataDir, {
      channel: "chrome",
      headless,
      args,
      viewport: { width: 1440, height: 1000 },
    });
  } catch (error) {
    launchErrors.push(`Playwright chrome channel failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    return await chromium.launchPersistentContext(config.userDataDir, {
      channel: "msedge",
      headless,
      args,
      viewport: { width: 1440, height: 1000 },
    });
  } catch (error) {
    launchErrors.push(`Playwright msedge channel failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  throw new ChatGPTWebError(
    "CHATGPT_WEB_BROWSER_FAILED",
    `${zh.launchFailed} Profile: ${config.userDataDir}. Details: ${launchErrors.join(" | ")}`,
  );
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
    if (error instanceof ChatGPTWebError) {
      throw error;
    }

    throw new ChatGPTWebError("CHATGPT_WEB_BROWSER_FAILED", error instanceof Error ? error.message : zh.browserStartFailed);
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

async function createChatGPTPage(config: ChatGPTWebRuntimeConfig, forceHeaded = false) {
  const context = await getSharedContext(config, forceHeaded);
  sharedPage = await context.newPage();
  return sharedPage;
}

function isChatGPTNavigationTarget(url: string) {
  return url.includes("chatgpt.com") || url.includes("auth.openai.com");
}

async function gotoChatGPT(page: Page, timeoutMs: number) {
  const timeout = Math.min(timeoutMs, 60000);

  try {
    await page.goto(CHATGPT_URL, {
      waitUntil: "domcontentloaded",
      timeout,
    });
  } catch {
    // Fall through to in-page navigation.
  }

  if (isChatGPTNavigationTarget(page.url())) {
    return;
  }

  await page
    .evaluate((url) => {
      window.location.href = url;
    }, CHATGPT_URL)
    .catch(() => null);

  await page.waitForURL((url) => isChatGPTNavigationTarget(url.href), { timeout }).catch(() => null);

  if (!isChatGPTNavigationTarget(page.url())) {
    throw new ChatGPTWebError("CHATGPT_WEB_BROWSER_FAILED", `${zh.pageNotNavigated} Current URL: ${page.url()}`);
  }
}

async function isLoggedIn(page: Page) {
  const url = page.url();
  if (url.includes("auth.openai.com") || url.includes("/auth/login")) {
    return false;
  }

  const loginButtons = await page.locator('a[href*="/auth/login"], button:has-text("Log in"), button:has-text("Sign up")').count().catch(() => 0);
  if (loginButtons > 0) {
    return false;
  }

  const composerCount = await page
    .locator('textarea[name="prompt-textarea"], [data-testid="composer-root"], div[contenteditable="true"]')
    .count()
    .catch(() => 0);

  return composerCount > 0;
}

async function getImageCandidates(page: Page) {
  return page.evaluate(() => {
    const images = Array.from(document.querySelectorAll("img")) as HTMLImageElement[];
    return images
      .map((image) => ({
        src: image.currentSrc || image.src,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      }))
      .filter((image) => image.src && image.width >= 256 && image.height >= 256);
  }) as Promise<ImageCandidate[]>;
}

function candidateKey(candidate: ImageCandidate) {
  return `${candidate.src}|${candidate.width}x${candidate.height}`;
}

async function locatorHasBox(locator: Locator) {
  const box = await locator.boundingBox().catch(() => null);
  return Boolean(box && box.width > 8 && box.height > 8);
}

async function clickLocator(locator: Locator) {
  await locator.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => null);
  try {
    await locator.click({ timeout: 3000 });
    return true;
  } catch {
    const box = await locator.boundingBox().catch(() => null);
    if (!box) {
      return false;
    }

    const page = locator.page();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    return true;
  }
}

async function clickLastUsable(locator: Locator) {
  const count = await locator.count().catch(() => 0);

  for (let index = count - 1; index >= 0; index -= 1) {
    const candidate = locator.nth(index);
    if (await locatorHasBox(candidate)) {
      if (await clickLocator(candidate)) {
        return true;
      }
    }
  }

  return false;
}

async function focusComposer(page: Page) {
  await page.keyboard.press("Escape").catch(() => null);

  const candidates = [
    page.locator('[data-testid="composer-root"] div[contenteditable="true"]'),
    page.locator('[data-testid="composer-root"]'),
    page.locator('form:has(textarea[name="prompt-textarea"])'),
    page.locator('div[contenteditable="true"][role="textbox"]'),
    page.locator('div[contenteditable="plaintext-only"]'),
    page.locator('div[contenteditable="true"]'),
    page.locator('textarea[name="prompt-textarea"]'),
    page.locator('textarea[aria-label*="ChatGPT"]'),
    page.locator('main form'),
    page.getByText(/\u6709\u95ee\u9898/),
    page.getByText(/Message ChatGPT/i),
  ];

  for (const locator of candidates) {
    if (await clickLastUsable(locator)) {
      return true;
    }
  }

  const clickedByDom = await page
    .evaluate(() => {
      const selectors = [
        '[data-testid="composer-root"]',
        'form:has(textarea[name="prompt-textarea"])',
        'textarea[name="prompt-textarea"]',
        'main form',
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement | null;
        const target = element?.closest("form") || element;
        if (!target) {
          continue;
        }

        const rect = target.getBoundingClientRect();
        if (rect.width <= 8 || rect.height <= 8) {
          continue;
        }

        const clickTarget = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) as HTMLElement | null;
        (clickTarget || target).click();
        (clickTarget || target).focus();
        return true;
      }

      return false;
    })
    .catch(() => false);

  return clickedByDom;
}

async function forceSetComposerText(page: Page, prompt: string) {
  return page
    .evaluate((text) => {
      function isVisible(element: Element) {
        const htmlElement = element as HTMLElement;
        const rect = htmlElement.getBoundingClientRect();
        const style = window.getComputedStyle(htmlElement);
        return rect.width > 4 && rect.height > 4 && style.display !== "none" && style.visibility !== "hidden";
      }

      const editors = Array.from(document.querySelectorAll('[contenteditable="true"], [contenteditable="plaintext-only"]')) as HTMLElement[];
      const editor = editors.reverse().find(isVisible);
      if (editor) {
        editor.focus();
        document.execCommand("selectAll", false);
        document.execCommand("insertText", false, text);
        editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
        return true;
      }

      const textareas = Array.from(document.querySelectorAll("textarea")) as HTMLTextAreaElement[];
      const textarea = textareas.reverse().find(isVisible) || textareas.find((item) => item.name === "prompt-textarea");
      if (textarea) {
        const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
        descriptor?.set?.call(textarea, text);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
        textarea.focus();
        return true;
      }

      return false;
    }, prompt)
    .catch(() => false);
}

async function composerHasPrompt(page: Page, prompt: string) {
  const needle = prompt.trim().slice(0, 12);
  if (!needle) {
    return false;
  }

  return page
    .evaluate((value) => {
      const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | HTMLElement | null;
      const activeValue = "value" in (active || {}) ? String((active as HTMLInputElement | HTMLTextAreaElement).value || "") : active?.textContent || "";
      const textareas = Array.from(document.querySelectorAll("textarea")) as HTMLTextAreaElement[];
      const editors = Array.from(document.querySelectorAll('[contenteditable="true"], [contenteditable="plaintext-only"]')) as HTMLElement[];
      const allText = [activeValue, ...textareas.map((item) => item.value), ...editors.map((item) => item.textContent || "")].join("\n");
      return allText.includes(value);
    }, needle)
    .catch(() => false);
}

async function typePrompt(page: Page, prompt: string) {
  if (!(await focusComposer(page))) {
    throw new ChatGPTWebError("CHATGPT_WEB_BROWSER_FAILED", zh.noComposer);
  }

  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => null);
  await page.keyboard.press("Backspace").catch(() => null);
  await page.keyboard.insertText(prompt);
  await page.waitForTimeout(500);

  if (await composerHasPrompt(page, prompt)) {
    return;
  }

  if (await forceSetComposerText(page, prompt)) {
    await page.waitForTimeout(500);
    if (await composerHasPrompt(page, prompt)) {
      return;
    }
  }

  throw new ChatGPTWebError("CHATGPT_WEB_BROWSER_FAILED", zh.typeFailed);
}

async function clickGenerateImageTool(page: Page) {
  const toolButtons = [
    page.getByRole("button", { name: /\u751f\u6210\u56fe\u7247/ }),
    page.getByText(/\u751f\u6210\u56fe\u7247/),
    page.getByRole("button", { name: /Create image|Generate image/i }),
  ];

  for (const locator of toolButtons) {
    if (await clickLastUsable(locator)) {
      await page.waitForTimeout(300);
      return;
    }
  }
}

async function clickSendButton(page: Page) {
  const selectors = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="\u53d1\u9001"]',
    'button:has(svg)',
  ];

  for (const selector of selectors) {
    const clicked = await page
      .locator(selector)
      .evaluateAll((buttons) => {
        const visibleButtons = buttons
          .map((button) => button as HTMLButtonElement)
          .filter((button) => {
            const rect = button.getBoundingClientRect();
            const label = `${button.getAttribute("aria-label") || ""} ${button.textContent || ""}`.toLowerCase();
            const disabled = button.disabled || button.getAttribute("aria-disabled") === "true";
            const looksLikeSend = label.includes("send") || label.includes("\u53d1\u9001") || button.getAttribute("data-testid") === "send-button";
            return !disabled && rect.width > 8 && rect.height > 8 && looksLikeSend;
          });

        const target = visibleButtons[visibleButtons.length - 1];
        if (!target) {
          return false;
        }

        target.click();
        return true;
      })
      .catch(() => false);

    if (clicked) {
      return true;
    }
  }

  await page.keyboard.press("Enter").catch(() => null);
  await page.waitForTimeout(800);
  return true;
}

async function submitPrompt(page: Page, prompt: string) {
  await clickGenerateImageTool(page).catch(() => null);
  await typePrompt(page, prompt);
  if (!(await clickSendButton(page))) {
    throw new ChatGPTWebError("CHATGPT_WEB_BROWSER_FAILED", zh.sendFailed);
  }
}

async function waitForGeneratedImages(page: Page, previous: ImageCandidate[], imageCount: number, timeoutMs: number) {
  const previousKeys = previous.map(candidateKey);

  try {
    await page.waitForFunction(
      ({ keys, expectedCount }) => {
        const previousSet = new Set(keys);
        const images = Array.from(document.querySelectorAll("img")) as HTMLImageElement[];
        const generated = images.filter((image) => {
          const src = image.currentSrc || image.src;
          const width = image.naturalWidth || image.width;
          const height = image.naturalHeight || image.height;
          const key = `${src}|${width}x${height}`;
          return src && width >= 256 && height >= 256 && !previousSet.has(key);
        });
        return generated.length >= expectedCount;
      },
      { keys: previousKeys, expectedCount: imageCount },
      { timeout: timeoutMs },
    );
  } catch {
    throw new ChatGPTWebError("CHATGPT_WEB_TIMEOUT", zh.timeout);
  }
}

async function extractGeneratedImages(page: Page, previous: ImageCandidate[], imageCount: number) {
  const previousKeys = previous.map(candidateKey);
  const extracted = await page.evaluate(
    async ({ keys, count, readImageFailed }) => {
      const previousSet = new Set(keys);
      const images = Array.from(document.querySelectorAll("img")) as HTMLImageElement[];
      const candidates = images.filter((image) => {
        const src = image.currentSrc || image.src;
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        const key = `${src}|${width}x${height}`;
        return src && width >= 256 && height >= 256 && !previousSet.has(key);
      });

      const uniqueSrcs = Array.from(new Set(candidates.map((image) => image.currentSrc || image.src))).slice(-count);
      const output: Array<{ base64: string; mimeType: string }> = [];

      for (const src of uniqueSrcs) {
        if (src.startsWith("data:")) {
          const [header, base64] = src.split(",", 2);
          output.push({
            base64: base64 || "",
            mimeType: header.match(/^data:(.*?);base64/)?.[1] || "image/png",
          });
          continue;
        }

        const response = await fetch(src);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
          reader.onerror = () => reject(new Error(readImageFailed));
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
    { keys: previousKeys, count: imageCount, readImageFailed: zh.readImageFailed },
  );

  return extracted as ExtractedImage[];
}

export async function openChatGPTWebLoginBrowser(): Promise<ChatGPTWebStatus> {
  const config = await getChatGPTWebRuntimeConfig();
  assertEnabled(config);

  const page = await createChatGPTPage(config, true);
  await gotoChatGPT(page, config.timeoutMs);
  await page.bringToFront().catch(() => null);
  const ready = await isLoggedIn(page);

  return {
    enabled: config.enabled,
    ready,
    userDataDir: config.userDataDir,
    headless: false,
    timeoutSeconds: Math.floor(config.timeoutMs / 1000),
    message: ready ? zh.loggedIn : zh.loginBrowserOpened,
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
      message: zh.notEnabledStatus,
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
    message: ready ? zh.ready : zh.loginRequired,
  };
}

export async function generateWithChatGPTWeb(request: ImageGenerationRequest): Promise<GeneratedImagePayload[]> {
  const config = await getChatGPTWebRuntimeConfig();
  assertEnabled(config);

  const page = await getSharedPage(config);
  await gotoChatGPT(page, config.timeoutMs);

  if (!(await isLoggedIn(page))) {
    throw new ChatGPTWebError("CHATGPT_WEB_LOGIN_REQUIRED", zh.loginRequired);
  }

  const imageCount = normalizeCount(request.imageCount);
  const previousImages = await getImageCandidates(page);
  await submitPrompt(page, buildPrompt(request));
  await waitForGeneratedImages(page, previousImages, imageCount, config.timeoutMs);

  const extracted = await extractGeneratedImages(page, previousImages, imageCount);
  if (!extracted.length) {
    throw new ChatGPTWebError("CHATGPT_WEB_NO_IMAGE_FOUND", zh.noImage);
  }

  return extracted.map((image) => ({
    buffer: Buffer.from(image.base64, "base64"),
    mimeType: normalizeMimeType(image.mimeType),
  }));
}
