import { chromium } from "playwright";

async function main() {
  const proxy = process.env.CHROME_PROXY_SERVER || "";
  const args: string[] = ["--no-sandbox","--disable-dev-shm-usage","--disable-blink-features=AutomationControlled"];
  if (proxy) args.push(`--proxy-server=${proxy}`);

  console.log(`代理: ${proxy || "无"}`);

  const c = await chromium.launchPersistentContext("/root/image2-app/chatgpt-web-profile", {
    headless: false,
    channel: "chromium",
    args: [
      ...args,
      "--headless=new",
      "--window-size=1440,900",
    ],
    viewport: { width: 1440, height: 900 },
  });
  const p = c.pages()[0] || (await c.newPage());
  await p.goto("https://chatgpt.com", { waitUntil: "domcontentloaded", timeout: 20000 });
  await p.waitForTimeout(4000);

  const title = await p.title();
  const loginBtn = await p.locator('text="Log in"').count();
  const composer = await p.locator('textarea, [contenteditable="true"]').count();

  console.log(`Title: ${title} | LoginBtn: ${loginBtn} | Composer: ${composer}`);

  if (composer > 0 && loginBtn === 0) {
    console.log("✅ 已登录！");
  } else {
    console.log("❌ 未登录");
  }

  await c.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
