import { openChatGPTWebLoginBrowser } from "../src/lib/chatgpt-web";
import { loadChatGPTDevEnv } from "./chatgpt-dev-env";

async function main() {
  loadChatGPTDevEnv({ headless: false });

  const status = await openChatGPTWebLoginBrowser();
  console.log(status.message);
  console.log(`Profile: ${status.userDataDir}`);

  if (!status.ready) {
    console.log("请在打开的浏览器中完成 ChatGPT 登录；登录完成后按 Ctrl+C 关闭本脚本。");
    await new Promise(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
