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

export type AdminAppSettings = PublicAppSettings & {
  deepseekApiKeyConfigured: boolean;
  openaiApiKeyConfigured: boolean;
  encryptionReady: boolean;
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
  const { Prisma } = await import("@prisma/client");
  const { prisma } = await import("@/lib/db");

  await prisma.$executeRaw(
    Prisma.sql`INSERT INTO "AppSetting" (id, "key", "value", "isEncrypted", "createdAt", "updatedAt")
      VALUES (${createId()}, ${key}, ${value}, ${isEncrypted}, now(), now())
      ON CONFLICT ("key")
      DO UPDATE SET "value" = EXCLUDED."value", "isEncrypted" = EXCLUDED."isEncrypted", "updatedAt" = now()`
  );
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

  return {
    ...publicSettings,
    deepseekApiKeyConfigured: Boolean(map.get("deepseekApiKey")?.value || process.env.DEEPSEEK_API_KEY),
    openaiApiKeyConfigured: Boolean(map.get("openaiApiKey")?.value || process.env.OPENAI_API_KEY),
    encryptionReady: hasSettingsEncryptionKey()
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
