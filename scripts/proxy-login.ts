import { chromium } from "playwright";

async function main() {
  const profilePath = "/root/image2-app/chatgpt-web-profile";
  const noProxy = process.argv.includes("--no-proxy");

  const args: string[] = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-blink-features=AutomationControlled",
    "--disable-features=Translate,OptimizationHints",
    "--window-size=1440,900",
  ];

  if (!noProxy) {
    args.push("--proxy-server=socks5://186.244.240.82:1080");
    console.log("代理模式: 美国 IP");
  } else {
    console.log("直连模式");
  }

  console.log("启动 Chromium...");
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    args,
    viewport: { width: 1440, height: 900 },
  });

  await new Promise(r => setTimeout(r, 2000));
  const page = context.pages()[0] || (await context.newPage());

  // 模拟真人鼠标
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(300 + Math.random() * 800, 200 + Math.random() * 500, { steps: 8 });
    await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
  }

  console.log("打开 auth.openai.com...");
  await page.goto("https://auth.openai.com/log-in", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  const title = await page.title();
  console.log("标题:", title);

  if (title.includes("Just a moment")) {
    console.log("CF 验证中，VNC 手动过一下");
  }

  console.log("登录完成后 Ctrl+C");
  await new Promise(() => {});
}

main().catch(e => { console.error(e.message); process.exit(1); });
