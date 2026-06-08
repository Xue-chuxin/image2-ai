import { existsSync, readFileSync } from "fs";
import path from "path";

function stripQuotes(value: string) {
  const clean = value.trim();
  if ((clean.startsWith("\"") && clean.endsWith("\"")) || (clean.startsWith("'") && clean.endsWith("'"))) {
    return clean.slice(1, -1);
  }
  return clean;
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const index = line.indexOf("=");
    if (index < 1) {
      continue;
    }

    const key = line.slice(0, index).trim();
    const value = stripQuotes(line.slice(index + 1));
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function loadChatGPTDevEnv({ headless, forceHeadless = false }: { headless?: boolean; forceHeadless?: boolean } = {}) {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  loadEnvFile(path.resolve(process.cwd(), ".env"));

  process.env.CHATGPT_WEB_ENABLED ||= "true";
  process.env.CHATGPT_WEB_TIMEOUT_SECONDS ||= "180";
  process.env.CHATGPT_WEB_DEV_SKIP_DATABASE ||= "true";

  if (process.env.CHATGPT_WEB_DEV_SKIP_DATABASE !== "false") {
    delete process.env.DATABASE_URL;
  }

  if (typeof headless === "boolean" && (forceHeadless || !process.env.CHATGPT_WEB_HEADLESS)) {
    process.env.CHATGPT_WEB_HEADLESS = String(headless);
  }
}
