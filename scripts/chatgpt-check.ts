import { checkChatGPTWebStatus, closeChatGPTWebBrowser } from "../src/lib/chatgpt-web";
import { loadChatGPTDevEnv } from "./chatgpt-dev-env";

async function main() {
  loadChatGPTDevEnv({ headless: true });

  try {
    const status = await checkChatGPTWebStatus();
    console.log(status.message);
    console.log(`Ready: ${status.ready ? "yes" : "no"}`);
    console.log(`Headless: ${status.headless ? "yes" : "no"}`);
    console.log(`Profile: ${status.userDataDir}`);
  } finally {
    await closeChatGPTWebBrowser();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
