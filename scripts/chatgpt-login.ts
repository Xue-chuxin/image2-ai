import { openChatGPTWebLoginBrowser } from "../src/lib/chatgpt-web";

async function main() {
  const status = await openChatGPTWebLoginBrowser();
  console.log(status.message);
  console.log(`Profile: ${status.userDataDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
