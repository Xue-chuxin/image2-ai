import path from "path";
import { randomBytes } from "crypto";

import { decryptSecret, encryptSecret, hasSettingsEncryptionKey } from "@/lib/app-crypto";

export type GenerationProviderName = "openai" | "chatgpt_web";
export type StorageProviderName = "local" | "oss" | "cos" | "s3";

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
  storageProvider: StorageProviderName;
  storageLocalBaseDir: string;
  storagePublicBaseUrl: string;
  storageGeneratedPrefix: string;
  storageUploadsPrefix: string;
  storageEndpoint: string;
  storageBucket: string;
  storageRegion: string;
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
  moderationEnabled: boolean;
  moderationForbiddenWords: string;
  moderationBlockMessage: string;
  deepseekApiKeyConfigured: boolean;
  openaiApiKeyConfigured: boolean;
  encryptionReady: boolean;
  diagnostics: AdminDiagnosticItem[];
};

export type SaveAdminSettingsInput = Partial<PublicAppSettings> & {
  deepseekPolishPrompt?: string;
  moderationEnabled?: boolean | string;
  moderationForbiddenWords?: string;
  moderationBlockMessage?: string;
  deepseekApiKey?: string;
  openaiApiKey?: string;
};

export type ChatGPTWebRuntimeConfig = {
  enabled: boolean;
  userDataDir: string;
  headless: boolean;
  timeoutMs: number;
};

export type StorageRuntimeConfig = {
  provider: StorageProviderName;
  localBaseDir: string;
  publicBaseUrl: string;
  generatedPrefix: string;
  uploadsPrefix: string;
  endpoint: string;
  bucket: string;
  region: string;
};

export type ModerationRuntimeConfig = {
  enabled: boolean;
  forbiddenWords: string;
  blockMessage: string;
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
  openaiImageModel: "gpt-image-2",
  chatgptWebEnabled: false,
  chatgptWebUserDataDir: "chatgpt-web-profile",
  chatgptWebHeadless: false,
  chatgptWebTimeoutSeconds: 180,
  storageProvider: "local",
  storageLocalBaseDir: "public",
  storagePublicBaseUrl: "",
  storageGeneratedPrefix: "generated",
  storageUploadsPrefix: "uploads",
  storageEndpoint: "",
  storageBucket: "",
  storageRegion: "",
};

const defaultModerationSettings: ModerationRuntimeConfig = {
  enabled: true,
  forbiddenWords: "",
  blockMessage: "内容包含不适合生成的词语，请调整后再试。",
};

function createId() {
  return `set_${randomBytes(12).toString("hex")}`;
}

function normalizeProvider(value?: string): GenerationProviderName {
  return value === "chatgpt_web" ? "chatgpt_web" : "openai";
}

function normalizeStorageProvider(value?: string): StorageProviderName {
  if (value === "oss" || value === "cos" || value === "s3") {
    return value;
  }
  return "local";
}

function normalizeText(value: unknown, fallback: string, maxLength = 120) {
  if (typeof value !== "string") {
    return fallback;
  }
  const clean = value.trim();
  return clean ? clean.slice(0, maxLength) : fallback;
}

function normalizeForbiddenWords(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const seen = new Set<string>();
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => {
      const key = word.toLocaleLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 1000)
    .join("\n")
    .slice(0, 12000);
}

function normalizeStoragePrefix(value: unknown, fallback: string) {
  const clean = normalizeText(value, fallback, 80)
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9/_-]/g, "");

  return clean || fallback;
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

function getModerationSettings(map: Map<string, SettingRow>): ModerationRuntimeConfig {
  return {
    enabled: normalizeBoolean(map.get("moderationEnabled")?.value, defaultModerationSettings.enabled),
    forbiddenWords: normalizeForbiddenWords(map.get("moderationForbiddenWords")?.value || defaultModerationSettings.forbiddenWords),
    blockMessage: normalizeText(
      map.get("moderationBlockMessage")?.value,
      defaultModerationSettings.blockMessage,
      200,
    ),
  };
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

function resolveStorageLocalBaseDir(value: string) {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
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
  moderation: ModerationRuntimeConfig,
): Promise<AdminDiagnosticItem[]> {
  const encryptionReady = hasSettingsEncryptionKey();
  const providerIsOpenAI = settings.defaultGenerationProvider === "openai";
  const providerIsChatGPTWeb = settings.defaultGenerationProvider === "chatgpt_web";
  const forbiddenWordCount = normalizeForbiddenWords(moderation.forbiddenWords)
    .split("\n")
    .filter(Boolean).length;

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
    {
      key: "storage",
      label: "图片存储",
      status: settings.storageProvider === "local" ? "ok" : "warning",
      message:
        settings.storageProvider === "local"
          ? `当前使用本地存储，根目录：${settings.storageLocalBaseDir}。`
          : `${settings.storageProvider} 已预留配置，当前版本尚未接入对应对象存储 SDK。`,
    },
    {
      key: "moderation",
      label: "内容安全",
      status: moderation.enabled && forbiddenWordCount > 0 ? "ok" : "warning",
      message: moderation.enabled
        ? forbiddenWordCount > 0
          ? `已启用违禁词拦截，共 ${forbiddenWordCount} 条。`
          : "已启用违禁词拦截，但词库为空。"
        : "违禁词拦截未启用，正式上线前建议开启。",
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
    storageProvider: normalizeStorageProvider(getStoredSetting(map, "storageProvider") || process.env.STORAGE_PROVIDER || defaultSettings.storageProvider),
    storageLocalBaseDir: normalizeText(getStoredSetting(map, "storageLocalBaseDir") || process.env.STORAGE_LOCAL_BASE_DIR, defaultSettings.storageLocalBaseDir, 300),
    storagePublicBaseUrl: normalizeText(getStoredSetting(map, "storagePublicBaseUrl") || process.env.STORAGE_PUBLIC_BASE_URL, defaultSettings.storagePublicBaseUrl, 300),
    storageGeneratedPrefix: normalizeStoragePrefix(getStoredSetting(map, "storageGeneratedPrefix") || process.env.STORAGE_GENERATED_PREFIX, defaultSettings.storageGeneratedPrefix),
    storageUploadsPrefix: normalizeStoragePrefix(getStoredSetting(map, "storageUploadsPrefix") || process.env.STORAGE_UPLOADS_PREFIX, defaultSettings.storageUploadsPrefix),
    storageEndpoint: normalizeText(getStoredSetting(map, "storageEndpoint") || process.env.STORAGE_ENDPOINT, defaultSettings.storageEndpoint, 300),
    storageBucket: normalizeText(getStoredSetting(map, "storageBucket") || process.env.STORAGE_BUCKET, defaultSettings.storageBucket, 160),
    storageRegion: normalizeText(getStoredSetting(map, "storageRegion") || process.env.STORAGE_REGION, defaultSettings.storageRegion, 120),
  };
}

export async function getAdminAppSettings(): Promise<AdminAppSettings> {
  const map = toMap(await readSettingRows());
  const publicSettings = await getPublicAppSettings();
  const moderationSettings = getModerationSettings(map);
  const deepseekApiKeyConfigured = Boolean(map.get("deepseekApiKey")?.value || process.env.DEEPSEEK_API_KEY);
  const openaiApiKeyConfigured = Boolean(map.get("openaiApiKey")?.value || process.env.OPENAI_API_KEY);

  return {
    ...publicSettings,
    deepseekPolishPrompt: getStoredSetting(map, "deepseekPolishPrompt") || defaultDeepSeekPolishPrompt,
    moderationEnabled: moderationSettings.enabled,
    moderationForbiddenWords: moderationSettings.forbiddenWords,
    moderationBlockMessage: moderationSettings.blockMessage,
    deepseekApiKeyConfigured,
    openaiApiKeyConfigured,
    encryptionReady: hasSettingsEncryptionKey(),
    diagnostics: await buildDiagnostics(publicSettings, deepseekApiKeyConfigured, openaiApiKeyConfigured, moderationSettings),
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
  const moderationEnabled = normalizeBoolean(input.moderationEnabled, defaultModerationSettings.enabled);
  const moderationForbiddenWords = normalizeForbiddenWords(input.moderationForbiddenWords);
  const moderationBlockMessage = normalizeText(
    input.moderationBlockMessage,
    defaultModerationSettings.blockMessage,
    200,
  );
  const defaultGenerationProvider = normalizeProvider(input.defaultGenerationProvider);
  const chatgptWebEnabled = normalizeBoolean(input.chatgptWebEnabled, defaultSettings.chatgptWebEnabled);
  const chatgptWebUserDataDir = normalizeText(input.chatgptWebUserDataDir, defaultSettings.chatgptWebUserDataDir, 300);
  const chatgptWebHeadless = normalizeBoolean(input.chatgptWebHeadless, defaultSettings.chatgptWebHeadless);
  const chatgptWebTimeoutSeconds = normalizeTimeoutSeconds(input.chatgptWebTimeoutSeconds, defaultSettings.chatgptWebTimeoutSeconds);
  const storageProvider = normalizeStorageProvider(input.storageProvider);
  const storageLocalBaseDir = normalizeText(input.storageLocalBaseDir, defaultSettings.storageLocalBaseDir, 300);
  const storagePublicBaseUrl = normalizeText(input.storagePublicBaseUrl, defaultSettings.storagePublicBaseUrl, 300);
  const storageGeneratedPrefix = normalizeStoragePrefix(input.storageGeneratedPrefix, defaultSettings.storageGeneratedPrefix);
  const storageUploadsPrefix = normalizeStoragePrefix(input.storageUploadsPrefix, defaultSettings.storageUploadsPrefix);
  const storageEndpoint = normalizeText(input.storageEndpoint, defaultSettings.storageEndpoint, 300);
  const storageBucket = normalizeText(input.storageBucket, defaultSettings.storageBucket, 160);
  const storageRegion = normalizeText(input.storageRegion, defaultSettings.storageRegion, 120);

  await upsertSetting("browserTitle", browserTitle);
  await upsertSetting("siteTitle", siteTitle);
  await upsertSetting("siteSubtitle", siteSubtitle);
  await upsertSetting("deepseekBaseUrl", deepseekBaseUrl);
  await upsertSetting("deepseekModel", deepseekModel);
  await upsertSetting("openaiImageModel", openaiImageModel);
  await upsertSetting("deepseekPolishPrompt", deepseekPolishPrompt);
  await upsertSetting("moderationEnabled", String(moderationEnabled));
  await upsertSetting("moderationForbiddenWords", moderationForbiddenWords);
  await upsertSetting("moderationBlockMessage", moderationBlockMessage);
  await upsertSetting("defaultGenerationProvider", defaultGenerationProvider);
  await upsertSetting("chatgptWebEnabled", String(chatgptWebEnabled));
  await upsertSetting("chatgptWebUserDataDir", chatgptWebUserDataDir);
  await upsertSetting("chatgptWebHeadless", String(chatgptWebHeadless));
  await upsertSetting("chatgptWebTimeoutSeconds", String(chatgptWebTimeoutSeconds));
  await upsertSetting("storageProvider", storageProvider);
  await upsertSetting("storageLocalBaseDir", storageLocalBaseDir);
  await upsertSetting("storagePublicBaseUrl", storagePublicBaseUrl);
  await upsertSetting("storageGeneratedPrefix", storageGeneratedPrefix);
  await upsertSetting("storageUploadsPrefix", storageUploadsPrefix);
  await upsertSetting("storageEndpoint", storageEndpoint);
  await upsertSetting("storageBucket", storageBucket);
  await upsertSetting("storageRegion", storageRegion);

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

export async function getStorageRuntimeConfig(): Promise<StorageRuntimeConfig> {
  const settings = await getPublicAppSettings();

  return {
    provider: settings.storageProvider,
    localBaseDir: resolveStorageLocalBaseDir(settings.storageLocalBaseDir),
    publicBaseUrl: settings.storagePublicBaseUrl,
    generatedPrefix: settings.storageGeneratedPrefix,
    uploadsPrefix: settings.storageUploadsPrefix,
    endpoint: settings.storageEndpoint,
    bucket: settings.storageBucket,
    region: settings.storageRegion,
  };
}

export async function getModerationRuntimeConfig(): Promise<ModerationRuntimeConfig> {
  return getModerationSettings(toMap(await readSettingRows()));
}
