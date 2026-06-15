import { chromium } from "playwright";

function parseCookies(raw: string): Array<{ name: string; value: string }> {
  const result: Array<{ name: string; value: string }> = [];
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const name = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!name || !value) continue;
    result.push({ name, value });
  }
  return result;
}

async function main() {
  const cookiesRaw = process.env.CHATGPT_COOKIES;
  if (!cookiesRaw) {
    console.error("请设置 CHATGPT_COOKIES 环境变量");
    process.exit(1);
  }

  const profilePath = process.env.HOME + "/image2-app/chatgpt-web-profile";

  console.log("启动浏览器（使用 new headless 模式绕过 Cloudflare）...");
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false, // xvfb handles the display
    channel: "chromium",
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-infobars",
      "--window-size=1440,900",
    ],
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  });

  const page = context.pages()[0] || (await context.newPage());

  // Inject stealth
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["zh-CN", "zh", "en-US", "en"] });
    (navigator as any).chrome = { runtime: {} };
    (navigator as any).permissions = { query: async () => ({ state: "granted" }) };
  });

  console.log("注入 Cookie...");
  await page.goto("https://chatgpt.com", { waitUntil: "domcontentloaded", timeout: 15000 });

  const cookies = parseCookies(cookiesRaw);
  console.log(`共 ${cookies.length} 个 Cookie`);

  for (const c of cookies) {
    try {
      const isSecure = c.name.startsWith("__Secure-") || c.name.startsWith("__Host-");
      await context.addCookies([{
        name: c.name,
        value: c.value,
        domain: ".chatgpt.com",
        path: "/",
        secure: isSecure,
        httpOnly: false,
        sameSite: isSecure ? ("Lax" as const) : undefined,
      }]);
    } catch (e: any) {
      console.log(`  ❌ ${c.name}: ${e.message.substring(0, 80)}`);
    }
  }

  console.log("重新加载...");
  await page.goto("https://chatgpt.com", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);

  await page.screenshot({ path: "/tmp/chatgpt-debug.png" });
  const pageTitle = await page.title();
  const bodyText = (await page.locator("body").innerText().catch(() => "")).substring(0, 300);
  console.log(`Title: ${pageTitle}`);
  console.log(`Body: ${bodyText}`);

  if (pageTitle.toLowerCase().includes("chatgpt") && !bodyText.includes("Just a moment")) {
    console.log("✅ 通过 Cloudflare！Profile: " + profilePath);
  } else if (bodyText.includes("Just a moment")) {
    console.log("❌ Cloudflare 仍然拦截中");
  } else {
    console.log("⚠ 状态不确定，查看截图 /tmp/chatgpt-debug.png");
  }

  await context.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
