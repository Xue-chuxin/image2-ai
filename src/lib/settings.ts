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
};

export type AdminDiagnosticStatus = "ok" | "warning" | "error";

export type AdminDiagnosticItem = {
  key: string;
  label: string;
  status: AdminDiagnosticStatus;
  message: string;
};

export type AdminAppSettings = PublicAppSettings & {
  deepseekApiKeyConfigured: boolean;
  openaiApiKeyConfigured: boolean;
  encryptionReady: boolean;
  diagnostics: AdminDiagnosticItem[];
};

export type SaveAdminSettingsInput = Partial<PublicAppSettings> & {
  deepseekApiKey?: string;
  openaiApiKey?: string;
};

type SettingRow = {
  key: string;
  value: string;
  isEncrypted: boolean;
};

const defaultSettings: PublicAppSettings = {
  browserTitle: "Image2 Studio",
  siteTitle: "造图台",
  siteSubtitle: "Image Studio",
  defaultGenerationProvider: "openai",
  deepseekBaseUrl: "https://api.deepseek.com",
  deepseekModel: "deepseek-v4-flash",
  openaiImageModel: "gpt-image-1"
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

function getStoredSetting(map: Map<string, SettingRow>, key: keyof PublicAppSettings) {
  return map.get(key)?.value;
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
      DO UPDATE SET "value" = EXCLUDED."value", "isEncrypted" = EXCLUDED."isEncrypted", "updatedAt" = now()`
  );
}

async function checkDatabase(): Promise<AdminDiagnosticItem> {
  if (!process.env.DATABASE_URL) {
    return {
      key: "database",
      label: "数据库连接",
      status: "error",
      message: "缺少 DATABASE_URL，后台配置、登录和任务落库不可用。"
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
      message: "PostgreSQL 已连接，后台数据可读写。"
    };
  } catch (error) {
    return {
      key: "database",
      label: "数据库连接",
      status: "error",
      message: error instanceof Error ? error.message : "数据库连接失败。"
    };
  }
}

async function buildDiagnostics(
  settings: PublicAppSettings,
  deepseekApiKeyConfigured: boolean,
  openaiApiKeyConfigured: boolean
): Promise<AdminDiagnosticItem[]> {
  const encryptionReady = hasSettingsEncryptionKey();
  const providerIsOpenAI = settings.defaultGenerationProvider === "openai";

  return [
    await checkDatabase(),
    {
      key: "encryption",
      label: "密钥加密",
      status: encryptionReady ? "ok" : "error",
      message: encryptionReady ? "SETTINGS_ENCRYPTION_KEY 已配置，API Key 可加密保存。" : "缺少 SETTINGS_ENCRYPTION_KEY，不能保存新的 API Key。"
    },
    {
      key: "deepseek",
      label: "DeepSeek 润色",
      status: deepseekApiKeyConfigured ? "ok" : "warning",
      message: deepseekApiKeyConfigured ? `已配置 ${settings.deepseekModel}。` : "未配置 DeepSeek API Key，润色会使用本地兜底结果。"
    },
    {
      key: "openai",
      label: "OpenAI 生图",
      status: openaiApiKeyConfigured ? "ok" : providerIsOpenAI ? "error" : "warning",
      message: openaiApiKeyConfigured ? `已配置 ${settings.openaiImageModel}。` : "未配置 OpenAI API Key，真实生图不可用。"
    },
    {
      key: "provider",
      label: "默认 Provider",
      status: settings.defaultGenerationProvider === "chatgpt_web" ? "warning" : "ok",
      message:
        settings.defaultGenerationProvider === "chatgpt_web"
          ? "ChatGPT Web 目前只是预留接口，默认会返回未启用。"
          : "默认使用 OpenAI 官方 API。"
    }
  ];
}

export async function getPublicAppSettings(): Promise<PublicAppSettings> {
  const map = toMap(await readSettingRows());

  return {
    browserTitle: getStoredSetting(map, "browserTitle") || defaultSettings.browserTitle,
    siteTitle: getStoredSetting(map, "siteTitle") || defaultSettings.siteTitle,
    siteSubtitle: getStoredSetting(map, "siteSubtitle") || defaultSettings.siteSubtitle,
    defaultGenerationProvider: normalizeProvider(getStoredSetting(map, "defaultGenerationProvider") || process.env.DEFAULT_GENERATION_PROVIDER || defaultSettings.defaultGenerationProvider),
    deepseekBaseUrl: getStoredSetting(map, "deepseekBaseUrl") || process.env.DEEPSEEK_BASE_URL || defaultSettings.deepseekBaseUrl,
    deepseekModel: getStoredSetting(map, "deepseekModel") || process.env.DEEPSEEK_MODEL || defaultSettings.deepseekModel,
    openaiImageModel: getStoredSetting(map, "openaiImageModel") || process.env.OPENAI_IMAGE_MODEL || defaultSettings.openaiImageModel
  };
}

export async function getAdminAppSettings(): Promise<AdminAppSettings> {
  const map = toMap(await readSettingRows());
  const publicSettings = await getPublicAppSettings();
  const deepseekApiKeyConfigured = Boolean(map.get("deepseekApiKey")?.value || process.env.DEEPSEEK_API_KEY);
  const openaiApiKeyConfigured = Boolean(map.get("openaiApiKey")?.value || process.env.OPENAI_API_KEY);

  return {
    ...publicSettings,
    deepseekApiKeyConfigured,
    openaiApiKeyConfigured,
    encryptionReady: hasSettingsEncryptionKey(),
    diagnostics: await buildDiagnostics(publicSettings, deepseekApiKeyConfigured, openaiApiKeyConfigured)
  };
}

export async function saveAdminAppSettings(input: SaveAdminSettingsInput) {
  const browserTitle = normalizeText(input.browserTitle, defaultSettings.browserTitle);
  const siteTitle = normalizeText(input.siteTitle, defaultSettings.siteTitle);
  const siteSubtitle = normalizeText(input.siteSubtitle, defaultSettings.siteSubtitle);
  const deepseekBaseUrl = normalizeText(input.deepseekBaseUrl, defaultSettings.deepseekBaseUrl, 200);
  const deepseekModel = normalizeText(input.deepseekModel, defaultSettings.deepseekModel);
  const openaiImageModel = normalizeText(input.openaiImageModel, defaultSettings.openaiImageModel);
  const defaultGenerationProvider = normalizeProvider(input.defaultGenerationProvider);

  await upsertSetting("browserTitle", browserTitle);
  await upsertSetting("siteTitle", siteTitle);
  await upsertSetting("siteSubtitle", siteSubtitle);
  await upsertSetting("deepseekBaseUrl", deepseekBaseUrl);
  await upsertSetting("deepseekModel", deepseekModel);
  await upsertSetting("openaiImageModel", openaiImageModel);
  await upsertSetting("defaultGenerationProvider", defaultGenerationProvider);

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

  return {
    apiKey: await getSecretValue("deepseekApiKey", process.env.DEEPSEEK_API_KEY),
    baseUrl: settings.deepseekBaseUrl,
    model: settings.deepseekModel
  };
}

export async function getOpenAIRuntimeConfig() {
  const settings = await getPublicAppSettings();

  return {
    apiKey: await getSecretValue("openaiApiKey", process.env.OPENAI_API_KEY),
    model: settings.openaiImageModel
  };
}
