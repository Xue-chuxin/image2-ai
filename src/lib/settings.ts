import path from "path";
import { randomBytes } from "crypto";

import { decryptSecret, encryptSecret, hasSettingsEncryptionKey } from "@/lib/app-crypto";

export type GenerationProviderName = "openai" | "chatgpt_web";

export type PublicAppSettings = {
  browserTitle: string;
  siteTitle: string;
  siteSubtitle: string;
  defaultGenerationProvider: GenerationProviderName;
  deepseekBaseUrl: string;
  deepseekModel: string;
  openaiImageModel: string;
  chatgptWebEnabled: boolean;
  chatgptWebUserDataDir: string;
  chatgptWebHeadless: boolean;
  chatgptWebTimeoutSeconds: number;
};

export type AdminDiagnosticStatus = "ok" | "warning" | "error";

export type AdminDiagnosticItem = {
  key: string;
  label: string;
  status: AdminDiagnosticStatus;
  message: string;
};

export type AdminAppSettings = PublicAppSettings & {
  deepseekPolishPrompt: string;
  deepseekApiKeyConfigured: boolean;
  openaiApiKeyConfigured: boolean;
  encryptionReady: boolean;
  diagnostics: AdminDiagnosticItem[];
};

export type SaveAdminSettingsInput = Partial<PublicAppSettings> & {
  deepseekPolishPrompt?: string;
  deepseekApiKey?: string;
  openaiApiKey?: string;
};

export type ChatGPTWebRuntimeConfig = {
  enabled: boolean;
  userDataDir: string;
  headless: boolean;
  timeoutMs: number;
};

type SettingRow = {
  key: string;
  value: string;
  isEncrypted: boolean;
};

const defaultDeepSeekPolishPrompt = [
  "你是图片生成平台的提示词润色助手。",
  "你的任务是把用户输入的中文画面描述改写成更清晰、具体、自然、适合图片生成的提示词。",
  "保留用户的核心意图，不要编造品牌、真人身份、敏感信息或不存在的业务数据。",
  "整体降低 AI 味，避免夸张营销词，偏真实、干净、克制、可商用落地。",
  "必须只返回 JSON，不要 Markdown，不要解释。",
  "JSON 字段必须包含：title, promptZh, promptEn, negativePrompt, styleTags, recommendedRatio, qualityHint。",
  "promptZh 是最终要回填到输入框的中文润色结果；promptEn 是可选的英文生图提示词；negativePrompt 写需要避免的内容。",
].join("\n");

function getLocalProfileBaseDir() {
  return path.join(process.env.LOCALAPPDATA || process.env.HOME || process.cwd(), "image2-app");
}

const defaultSettings: PublicAppSettings = {
  browserTitle: "Image2 Studio",
  siteTitle: "造图台",
  siteSubtitle: "Image Studio",
  defaultGenerationProvider: "openai",
  deepseekBaseUrl: "https://api.deepseek.com",
  deepseekModel: "deepseek-chat",
  openaiImageModel: "gpt-image-1",
  chatgptWebEnabled: false,
  chatgptWebUserDataDir: "chatgpt-web-profile",
  chatgptWebHeadless: false,
  chatgptWebTimeoutSeconds: 180,
};

function createId() {
  return `set_${randomBytes(12).toString("hex")}`;
}

function normalizeProvider(value?: string): GenerationProviderName {
  return value === "chatgpt_web" ? "chatgpt_web" : "openai";
}

function normalizeText(value: unknown, fallback: string, maxLength = 120) {
  if (typeof value !== "string") {
    return fallback;
  }
  const clean = value.trim();
  return clean ? clean.slice(0, maxLength) : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function normalizeTimeoutSeconds(value: unknown, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(numeric), 30), 900);
}

function getStoredSetting(map: Map<string, SettingRow>, key: keyof PublicAppSettings | "deepseekPolishPrompt") {
  return map.get(key)?.value;
}

function getStoredBoolean(map: Map<string, SettingRow>, key: keyof PublicAppSettings, envValue: string | undefined, fallback: boolean) {
  const storedValue = map.get(key)?.value;
  if (typeof storedValue === "string") {
    return normalizeBoolean(storedValue, fallback);
  }

  return normalizeBoolean(envValue, fallback);
}

function getStoredNumber(map: Map<string, SettingRow>, key: keyof PublicAppSettings, envValue: string | undefined, fallback: number) {
  const storedValue = map.get(key)?.value;
  if (typeof storedValue === "string") {
    return normalizeTimeoutSeconds(storedValue, fallback);
  }

  return normalizeTimeoutSeconds(envValue, fallback);
}

function resolveLocalPath(value: string) {
  return path.isAbsolute(value) ? value : path.resolve(getLocalProfileBaseDir(), value);
}

async function readSettingRows() {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  try {
    const { Prisma } = await import("@prisma/client");
    const { prisma } = await import("@/lib/db");
    return await prisma.$queryRaw<SettingRow[]>(Prisma.sql`SELECT "key", "value", "isEncrypted" FROM "AppSetting"`);
  } catch {
    return [];
  }
}

function toMap(rows: SettingRow[]) {
  return new Map(rows.map((row) => [row.key, row]));
}

async function upsertSetting(key: string, value: string, isEncrypted = false) {
  if (!process.env.DATABASE_URL) {
    throw new Error("缺少 DATABASE_URL，无法保存后台配置。");
  }

  const { Prisma } = await import("@prisma/client");
  const { prisma } = await import("@/lib/db");

  await prisma.$executeRaw(
    Prisma.sql`INSERT INTO "AppSetting" (id, "key", "value", "isEncrypted", "createdAt", "updatedAt")
      VALUES (${createId()}, ${key}, ${value}, ${isEncrypted}, now(), now())
      ON CONFLICT ("key")
      DO UPDATE SET "value" = EXCLUDED."value", "isEncrypted" = EXCLUDED."isEncrypted", "updatedAt" = now()`,
  );
}

async function checkDatabase(): Promise<AdminDiagnosticItem> {
  if (!process.env.DATABASE_URL) {
    return {
      key: "database",
      label: "数据库连接",
      status: "error",
      message: "缺少 DATABASE_URL，后台配置、登录和任务落库不可用。",
    };
  }

  try {
    const { Prisma } = await import("@prisma/client");
    const { prisma } = await import("@/lib/db");
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
    return {
      key: "database",
      label: "数据库连接",
      status: "ok",
      message: "PostgreSQL 已连接，后台数据可读写。",
    };
  } catch (error) {
    return {
      key: "database",
      label: "数据库连接",
      status: "error",
      message: error instanceof Error ? error.message : "数据库连接失败。",
    };
  }
}

async function buildDiagnostics(
  settings: PublicAppSettings,
  deepseekApiKeyConfigured: boolean,
  openaiApiKeyConfigured: boolean,
): Promise<AdminDiagnosticItem[]> {
  const encryptionReady = hasSettingsEncryptionKey();
  const providerIsOpenAI = settings.defaultGenerationProvider === "openai";
  const providerIsChatGPTWeb = settings.defaultGenerationProvider === "chatgpt_web";

  return [
    await checkDatabase(),
    {
      key: "encryption",
      label: "密钥加密",
      status: encryptionReady ? "ok" : "error",
      message: encryptionReady ? "SETTINGS_ENCRYPTION_KEY 已配置，API Key 可加密保存。" : "缺少 SETTINGS_ENCRYPTION_KEY，不能保存新的 API Key。",
    },
    {
      key: "deepseek",
      label: "DeepSeek 润色",
      status: deepseekApiKeyConfigured ? "ok" : "warning",
      message: deepseekApiKeyConfigured ? `已配置 ${settings.deepseekModel}。` : "未配置 DeepSeek API Key，润色会使用本地兜底结果。",
    },
    {
      key: "openai",
      label: "OpenAI 生图",
      status: openaiApiKeyConfigured ? "ok" : providerIsOpenAI ? "error" : "warning",
      message: openaiApiKeyConfigured ? `已配置 ${settings.openaiImageModel}。` : "未配置 OpenAI API Key，OpenAI 官方通道不可用。",
    },
    {
      key: "chatgpt_web",
      label: "ChatGPT Web",
      status: settings.chatgptWebEnabled ? "warning" : providerIsChatGPTWeb ? "error" : "warning",
      message: settings.chatgptWebEnabled
        ? "已启用本机浏览器通道，请在下方检测 ChatGPT 登录状态。"
        : "未启用本机浏览器通道，默认 Provider 不能选择 ChatGPT Web。",
    },
    {
      key: "provider",
      label: "默认 Provider",
      status: providerIsChatGPTWeb && !settings.chatgptWebEnabled ? "error" : "ok",
      message: providerIsChatGPTWeb ? "默认使用 ChatGPT Web 本机浏览器通道。" : "默认使用 OpenAI 官方 API。",
    },
  ];
}

export async function getPublicAppSettings(): Promise<PublicAppSettings> {
  const map = toMap(await readSettingRows());
  const chatgptWebUserDataDir = normalizeText(
    getStoredSetting(map, "chatgptWebUserDataDir") || process.env.CHATGPT_WEB_USER_DATA_DIR,
    defaultSettings.chatgptWebUserDataDir,
    300,
  );

  return {
    browserTitle: getStoredSetting(map, "browserTitle") || defaultSettings.browserTitle,
    siteTitle: getStoredSetting(map, "siteTitle") || defaultSettings.siteTitle,
    siteSubtitle: getStoredSetting(map, "siteSubtitle") || defaultSettings.siteSubtitle,
    defaultGenerationProvider: normalizeProvider(
      getStoredSetting(map, "defaultGenerationProvider") || process.env.DEFAULT_GENERATION_PROVIDER || defaultSettings.defaultGenerationProvider,
    ),
    deepseekBaseUrl: getStoredSetting(map, "deepseekBaseUrl") || process.env.DEEPSEEK_BASE_URL || defaultSettings.deepseekBaseUrl,
    deepseekModel: getStoredSetting(map, "deepseekModel") || process.env.DEEPSEEK_MODEL || defaultSettings.deepseekModel,
    openaiImageModel: getStoredSetting(map, "openaiImageModel") || process.env.OPENAI_IMAGE_MODEL || defaultSettings.openaiImageModel,
    chatgptWebEnabled: getStoredBoolean(map, "chatgptWebEnabled", process.env.CHATGPT_WEB_ENABLED, defaultSettings.chatgptWebEnabled),
    chatgptWebUserDataDir,
    chatgptWebHeadless: getStoredBoolean(map, "chatgptWebHeadless", process.env.CHATGPT_WEB_HEADLESS, defaultSettings.chatgptWebHeadless),
    chatgptWebTimeoutSeconds: getStoredNumber(
      map,
      "chatgptWebTimeoutSeconds",
      process.env.CHATGPT_WEB_TIMEOUT_SECONDS,
      defaultSettings.chatgptWebTimeoutSeconds,
    ),
  };
}

export async function getAdminAppSettings(): Promise<AdminAppSettings> {
  const map = toMap(await readSettingRows());
  const publicSettings = await getPublicAppSettings();
  const deepseekApiKeyConfigured = Boolean(map.get("deepseekApiKey")?.value || process.env.DEEPSEEK_API_KEY);
  const openaiApiKeyConfigured = Boolean(map.get("openaiApiKey")?.value || process.env.OPENAI_API_KEY);

  return {
    ...publicSettings,
    deepseekPolishPrompt: getStoredSetting(map, "deepseekPolishPrompt") || defaultDeepSeekPolishPrompt,
    deepseekApiKeyConfigured,
    openaiApiKeyConfigured,
    encryptionReady: hasSettingsEncryptionKey(),
    diagnostics: await buildDiagnostics(publicSettings, deepseekApiKeyConfigured, openaiApiKeyConfigured),
  };
}

export async function saveAdminAppSettings(input: SaveAdminSettingsInput) {
  const browserTitle = normalizeText(input.browserTitle, defaultSettings.browserTitle);
  const siteTitle = normalizeText(input.siteTitle, defaultSettings.siteTitle);
  const siteSubtitle = normalizeText(input.siteSubtitle, defaultSettings.siteSubtitle);
  const deepseekBaseUrl = normalizeText(input.deepseekBaseUrl, defaultSettings.deepseekBaseUrl, 200);
  const deepseekModel = normalizeText(input.deepseekModel, defaultSettings.deepseekModel);
  const openaiImageModel = normalizeText(input.openaiImageModel, defaultSettings.openaiImageModel);
  const deepseekPolishPrompt = normalizeText(input.deepseekPolishPrompt, defaultDeepSeekPolishPrompt, 6000);
  const defaultGenerationProvider = normalizeProvider(input.defaultGenerationProvider);
  const chatgptWebEnabled = normalizeBoolean(input.chatgptWebEnabled, defaultSettings.chatgptWebEnabled);
  const chatgptWebUserDataDir = normalizeText(input.chatgptWebUserDataDir, defaultSettings.chatgptWebUserDataDir, 300);
  const chatgptWebHeadless = normalizeBoolean(input.chatgptWebHeadless, defaultSettings.chatgptWebHeadless);
  const chatgptWebTimeoutSeconds = normalizeTimeoutSeconds(input.chatgptWebTimeoutSeconds, defaultSettings.chatgptWebTimeoutSeconds);

  await upsertSetting("browserTitle", browserTitle);
  await upsertSetting("siteTitle", siteTitle);
  await upsertSetting("siteSubtitle", siteSubtitle);
  await upsertSetting("deepseekBaseUrl", deepseekBaseUrl);
  await upsertSetting("deepseekModel", deepseekModel);
  await upsertSetting("openaiImageModel", openaiImageModel);
  await upsertSetting("deepseekPolishPrompt", deepseekPolishPrompt);
  await upsertSetting("defaultGenerationProvider", defaultGenerationProvider);
  await upsertSetting("chatgptWebEnabled", String(chatgptWebEnabled));
  await upsertSetting("chatgptWebUserDataDir", chatgptWebUserDataDir);
  await upsertSetting("chatgptWebHeadless", String(chatgptWebHeadless));
  await upsertSetting("chatgptWebTimeoutSeconds", String(chatgptWebTimeoutSeconds));

  if (input.deepseekApiKey?.trim()) {
    await upsertSetting("deepseekApiKey", encryptSecret(input.deepseekApiKey.trim()), true);
  }

  if (input.openaiApiKey?.trim()) {
    await upsertSetting("openaiApiKey", encryptSecret(input.openaiApiKey.trim()), true);
  }
}

async function getSecretValue(key: "deepseekApiKey" | "openaiApiKey", envValue?: string) {
  const map = toMap(await readSettingRows());
  const row = map.get(key);

  if (!row?.value) {
    return envValue || "";
  }

  return row.isEncrypted ? decryptSecret(row.value) : row.value;
}

export async function getDeepSeekRuntimeConfig() {
  const settings = await getPublicAppSettings();
  const adminSettings = await getAdminAppSettings();

  return {
    apiKey: await getSecretValue("deepseekApiKey", process.env.DEEPSEEK_API_KEY),
    baseUrl: settings.deepseekBaseUrl,
    model: settings.deepseekModel,
    polishPrompt: adminSettings.deepseekPolishPrompt,
  };
}

export async function getOpenAIRuntimeConfig() {
  const settings = await getPublicAppSettings();

  return {
    apiKey: await getSecretValue("openaiApiKey", process.env.OPENAI_API_KEY),
    model: settings.openaiImageModel,
  };
}

export async function getChatGPTWebRuntimeConfig(): Promise<ChatGPTWebRuntimeConfig> {
  const settings = await getPublicAppSettings();

  return {
    enabled: settings.chatgptWebEnabled,
    userDataDir: resolveLocalPath(settings.chatgptWebUserDataDir),
    headless: settings.chatgptWebHeadless,
    timeoutMs: settings.chatgptWebTimeoutSeconds * 1000,
  };
}
