import path from "path";
import { randomBytes } from "crypto";

import { AppError } from "@/lib/app-error";
import { decryptSecret, encryptSecret, hasSettingsEncryptionKey } from "@/lib/app-crypto";

export type GenerationProviderName = "openai" | "chatgpt_web" | "stability_ai";
export type StorageProviderName = "local" | "oss" | "cos" | "s3";
export type FrontTemplateName = "tdesign_workspace" | "glass_app";
export type HomePopupContentFormat = "markdown" | "html";

export type FooterFriendLink = {
  label: string;
  href: string;
};

export type HomePopupSettings = {
  enabled: boolean;
  title: string;
  contentFormat: HomePopupContentFormat;
  content: string;
};

export type PublicAppSettings = {
  browserTitle: string;
  siteTitle: string;
  siteSubtitle: string;
  siteLogoUrl: string;
  siteFaviconUrl: string;
  frontTemplate: FrontTemplateName;
  homePopup: HomePopupSettings;
  icpNumber: string;
  friendLinks: FooterFriendLink[];
  defaultGenerationProvider: GenerationProviderName;
  deepseekBaseUrl: string;
  deepseekModel: string;
  openaiImageModel: string;
  stabilityAiModel: string;
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

export type OpenAICompatibleChannelSetting = {
  id: string;
  name: string;
  enabled: boolean;
  baseUrl: string;
  model: string;
  timeoutSeconds: number;
  priority: number;
  apiKeyConfigured: boolean;
};

export type OpenAICompatibleRuntimeChannel = Omit<OpenAICompatibleChannelSetting, "apiKeyConfigured"> & {
  apiKey: string;
};

export type AdminDiagnosticStatus = "ok" | "warning" | "error";

export type AdminDiagnosticItem = {
  key: string;
  label: string;
  status: AdminDiagnosticStatus;
  message: string;
};

export type AdminAppSettings = PublicAppSettings & {
  openaiCompatibleChannels: OpenAICompatibleChannelSetting[];
  deepseekPolishPrompt: string;
  moderationEnabled: boolean;
  moderationForbiddenWords: string;
  moderationBlockMessage: string;
  emailSmtpEnabled: boolean;
  emailSmtpHost: string;
  emailSmtpPort: number;
  emailSmtpSecure: boolean;
  emailSmtpUser: string;
  emailFromEmail: string;
  emailFromName: string;
  emailReplyTo: string;
  emailTestRecipient: string;
  emailSmtpPasswordConfigured: boolean;
  deepseekApiKeyConfigured: boolean;
  openaiApiKeyConfigured: boolean;
  legacyOpenaiApiKeyConfigured: boolean;
  stabilityAiApiKeyConfigured: boolean;
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
  openaiCompatibleChannels?: Array<Partial<OpenAICompatibleChannelSetting> & { apiKey?: string }>;
  stabilityAiApiKey?: string;
  emailSmtpEnabled?: boolean | string;
  emailSmtpHost?: string;
  emailSmtpPort?: number | string;
  emailSmtpSecure?: boolean | string;
  emailSmtpUser?: string;
  emailSmtpPassword?: string;
  emailFromEmail?: string;
  emailFromName?: string;
  emailReplyTo?: string;
  emailTestRecipient?: string;
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

export type EmailRuntimeConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  testRecipient: string;
};

type SettingRow = {
  key: string;
  value: string;
  isEncrypted: boolean;
};

type SettingWrite = {
  key: string;
  value: string;
  isEncrypted?: boolean;
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
  siteLogoUrl: "/brand-logo.svg",
  siteFaviconUrl: "/favicon.svg",
  frontTemplate: "tdesign_workspace",
  homePopup: {
    enabled: false,
    title: "公告",
    contentFormat: "markdown",
    content: "",
  },
  icpNumber: "",
  friendLinks: [],
  defaultGenerationProvider: "openai",
  deepseekBaseUrl: "https://api.deepseek.com",
  deepseekModel: "deepseek-chat",
  openaiImageModel: "gpt-image-2",
  stabilityAiModel: "stable-diffusion-xl-1024-v1-0",
  chatgptWebEnabled: false,
  chatgptWebUserDataDir: "chatgpt-web-profile",
  chatgptWebHeadless: false,
  chatgptWebTimeoutSeconds: 180,
  storageProvider: "local",
  storageLocalBaseDir: "public/storage",
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

const defaultEmailSettings: Omit<EmailRuntimeConfig, "password"> = {
  enabled: false,
  host: "",
  port: 465,
  secure: true,
  username: "",
  fromEmail: "",
  fromName: "造图台",
  replyTo: "",
  testRecipient: "",
};

type StoredOpenAICompatibleChannel = {
  id: string;
  name: string;
  enabled: boolean;
  baseUrl: string;
  model: string;
  timeoutSeconds: number;
  priority: number;
  apiKey: string;
};

const OPENAI_COMPATIBLE_CHANNEL_LIMIT = 8;
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_CHANNEL_ID = "official-openai";

function createId() {
  return `set_${randomBytes(12).toString("hex")}`;
}

function normalizeProvider(value?: string): GenerationProviderName {
  if (value === "chatgpt_web") return "chatgpt_web";
  if (value === "stability_ai") return "stability_ai";
  return "openai";
}

function normalizeFrontTemplate(value?: string): FrontTemplateName {
  if (value === "glass_app") return "glass_app";
  return "tdesign_workspace";
}

function normalizeHomePopupContentFormat(value: unknown, fallback: HomePopupContentFormat): HomePopupContentFormat {
  if (value === "html") return "html";
  if (value === "markdown") return "markdown";
  return fallback;
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

function normalizeOptionalText(value: unknown, fallback: string, maxLength = 120) {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim().slice(0, maxLength);
}

function normalizeFooterLinkHref(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const clean = value.trim().slice(0, 300);
  if (!clean) {
    return "";
  }

  if (clean.startsWith("/") || clean.startsWith("#")) {
    return clean;
  }
  if (clean.startsWith("www.")) {
    return `https://${clean}`;
  }

  try {
    const url = new URL(clean);
    return url.protocol === "http:" || url.protocol === "https:" ? clean : "";
  } catch {
    return "";
  }
}

function normalizeAssetUrl(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const clean = value.trim().slice(0, 500);
  if (!clean) {
    return fallback;
  }

  if (clean.startsWith("/")) {
    return clean;
  }

  try {
    const url = new URL(clean);
    return url.protocol === "http:" || url.protocol === "https:" ? clean : fallback;
  } catch {
    return fallback;
  }
}

function parseFooterLinkTextLine(line: string) {
  const pipeParts = line.split(/[|｜]/);
  if (pipeParts.length >= 2) {
    return { label: pipeParts[0], href: pipeParts.slice(1).join("|") };
  }

  const commaParts = line.split(/[，,]/);
  if (commaParts.length >= 2) {
    return { label: commaParts[0], href: commaParts.slice(1).join(",") };
  }

  const urlMatch = line.match(/\s+(https?:\/\/\S+|www\.\S+|\/\S*|#\S+)$/);
  if (urlMatch?.index) {
    return { label: line.slice(0, urlMatch.index), href: urlMatch[1] };
  }

  return null;
}

function parseFooterLinksText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseFooterLinkTextLine)
    .filter((link): link is { label: string; href: string } => Boolean(link));
}

function normalizeFriendLinks(value: unknown, fallback: FooterFriendLink[] = []) {
  let linkItems: unknown[];

  if (typeof value === "string") {
    const rawLinksText = value;
    try {
      const parsedLinks = rawLinksText.trim() ? JSON.parse(rawLinksText) : [];
      linkItems = Array.isArray(parsedLinks) ? parsedLinks : fallback;
    } catch {
      linkItems = parseFooterLinksText(rawLinksText);
    }
  } else if (Array.isArray(value)) {
    linkItems = value;
  } else {
    linkItems = fallback;
  }

  const seen = new Set<string>();

  return linkItems
    .map((link) => {
      if (!link || typeof link !== "object") {
        return null;
      }

      const record = link as Record<string, unknown>;
      const label = normalizeOptionalText(record.label, "", 40);
      const href = normalizeFooterLinkHref(record.href || record.url);

      if (!label || !href) {
        return null;
      }

      const key = `${label}|${href}`.toLocaleLowerCase();
      if (seen.has(key)) {
        return null;
      }
      seen.add(key);

      return { label, href };
    })
    .filter((link): link is FooterFriendLink => Boolean(link))
    .slice(0, 8);
}

function normalizeHomePopupSettings(value: unknown, fallback: HomePopupSettings): HomePopupSettings {
  let record: Record<string, unknown> | null = null;

  if (typeof value === "string") {
    try {
      const parsed = value.trim() ? JSON.parse(value) : null;
      record = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
      record = null;
    }
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    record = value as Record<string, unknown>;
  }

  if (!record) {
    return fallback;
  }

  return {
    enabled: normalizeBoolean(record.enabled, fallback.enabled),
    title: normalizeOptionalText(record.title, fallback.title, 80),
    contentFormat: normalizeHomePopupContentFormat(record.contentFormat, fallback.contentFormat),
    content: normalizeOptionalText(record.content, fallback.content, 20000),
  };
}

function normalizeSubmittedSecret(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmailAddress(value: unknown, fallback = "") {
  const clean = normalizeOptionalText(value, fallback, 254).toLowerCase();
  if (!clean) {
    return "";
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) ? clean : fallback;
}

function normalizeSubmittedEmailAddress(value: unknown, fallback: string, label: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const clean = value.trim().toLowerCase().slice(0, 254);
  if (!clean) {
    return "";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    throw new AppError("BAD_REQUEST", `${label}格式不正确。`, 400);
  }

  return clean;
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

function normalizePort(value: unknown, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(numeric), 1), 65535);
}

function normalizePriority(value: unknown, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(numeric), 0), 999);
}

function normalizeChannelId(value: unknown, fallback: string) {
  const clean = typeof value === "string" ? value.trim().replace(/[^a-zA-Z0-9_-]/g, "") : "";
  return clean ? clean.slice(0, 80) : fallback;
}

function normalizeBaseUrl(value: unknown, fallback = DEFAULT_OPENAI_BASE_URL) {
  const clean = normalizeText(value, fallback, 300).replace(/\/+$/, "");

  try {
    const url = new URL(clean);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new AppError("BAD_REQUEST", "OpenAI 兼容通道 Base URL 必须是合法的 http 或 https 地址。", 400);
  }
}

function getEncryptedSettingValue(row?: SettingRow) {
  if (!row?.value) {
    return "";
  }

  if (!row.isEncrypted) {
    return row.value;
  }

  try {
    return decryptSecret(row.value);
  } catch {
    return "";
  }
}

function canDecryptSetting(row?: SettingRow) {
  if (!row?.value || !row.isEncrypted) {
    return true;
  }

  try {
    decryptSecret(row.value);
    return true;
  } catch {
    return false;
  }
}

function parseStoredOpenAICompatibleChannels(map: Map<string, SettingRow>): StoredOpenAICompatibleChannel[] {
  const rawValue = getEncryptedSettingValue(map.get("openaiCompatibleChannels"));
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as Array<Partial<StoredOpenAICompatibleChannel>>;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.slice(0, OPENAI_COMPATIBLE_CHANNEL_LIMIT).map((channel, index) => ({
      id: normalizeChannelId(channel.id, `openai-compatible-${index + 1}`),
      name: normalizeText(channel.name, `中转站 ${index + 1}`, 80),
      enabled: normalizeBoolean(channel.enabled, true),
      baseUrl: normalizeBaseUrl(channel.baseUrl, DEFAULT_OPENAI_BASE_URL),
      model: normalizeText(channel.model, defaultSettings.openaiImageModel, 120),
      timeoutSeconds: normalizeTimeoutSeconds(channel.timeoutSeconds, 120),
      priority: normalizePriority(channel.priority, index),
      apiKey: typeof channel.apiKey === "string" ? channel.apiKey : "",
    })).sort((left, right) => left.priority - right.priority);
  } catch {
    return [];
  }
}

function getLegacyOpenAIChannel(map: Map<string, SettingRow>, settings?: Pick<PublicAppSettings, "openaiImageModel">): OpenAICompatibleChannelSetting {
  return {
    id: DEFAULT_OPENAI_CHANNEL_ID,
    name: "OpenAI 官方 API",
    enabled: true,
    baseUrl: DEFAULT_OPENAI_BASE_URL,
    model: settings?.openaiImageModel || getStoredSetting(map, "openaiImageModel") || process.env.OPENAI_IMAGE_MODEL || defaultSettings.openaiImageModel,
    timeoutSeconds: 120,
    priority: 0,
    apiKeyConfigured: Boolean(map.get("openaiApiKey")?.value || process.env.OPENAI_API_KEY),
  };
}

function toPublicOpenAICompatibleChannels(
  map: Map<string, SettingRow>,
  settings?: Pick<PublicAppSettings, "openaiImageModel">,
): OpenAICompatibleChannelSetting[] {
  const storedChannels = parseStoredOpenAICompatibleChannels(map);

  if (!storedChannels.length) {
    return [getLegacyOpenAIChannel(map, settings)];
  }

  return storedChannels.map(({ apiKey, ...channel }) => ({
    ...channel,
    apiKeyConfigured: Boolean(apiKey),
  }));
}

function normalizeSubmittedOpenAIChannels(
  inputChannels: SaveAdminSettingsInput["openaiCompatibleChannels"],
  existingChannels: StoredOpenAICompatibleChannel[],
  legacyOpenAIKey: string,
): StoredOpenAICompatibleChannel[] | null {
  if (!Array.isArray(inputChannels)) {
    return null;
  }

  const existingById = new Map(existingChannels.map((channel) => [channel.id, channel]));
  const normalized: StoredOpenAICompatibleChannel[] = [];
  const usedIds = new Set<string>();

  for (const [index, input] of inputChannels.slice(0, OPENAI_COMPATIBLE_CHANNEL_LIMIT).entries()) {
    const fallbackId = `openai-compatible-${index + 1}`;
    let id = normalizeChannelId(input.id, fallbackId);
    if (usedIds.has(id)) {
      id = `${id}-${index + 1}`;
    }
    usedIds.add(id);

    const existing = existingById.get(id);
    const submittedApiKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
    const fallbackApiKey = id === DEFAULT_OPENAI_CHANNEL_ID ? legacyOpenAIKey : "";

    normalized.push({
      id,
      name: normalizeText(input.name, `中转站 ${index + 1}`, 80),
      enabled: normalizeBoolean(input.enabled, true),
      baseUrl: normalizeBaseUrl(input.baseUrl, DEFAULT_OPENAI_BASE_URL),
      model: normalizeText(input.model, defaultSettings.openaiImageModel, 120),
      timeoutSeconds: normalizeTimeoutSeconds(input.timeoutSeconds, 120),
      priority: normalizePriority(input.priority, index),
      apiKey: submittedApiKey || existing?.apiKey || fallbackApiKey,
    });
  }

  return normalized.sort((left, right) => left.priority - right.priority);
}

function shouldPersistSubmittedOpenAIChannels(
  inputChannels: SaveAdminSettingsInput["openaiCompatibleChannels"],
  map: Map<string, SettingRow>,
  legacyModel: string,
) {
  if (!Array.isArray(inputChannels)) {
    return false;
  }

  if (map.get("openaiCompatibleChannels")?.value) {
    return true;
  }

  return inputChannels.some((channel) => {
    const id = normalizeChannelId(channel.id, "");
    const apiKey = typeof channel.apiKey === "string" ? channel.apiKey.trim() : "";
    const baseUrl = typeof channel.baseUrl === "string" ? channel.baseUrl.trim().replace(/\/+$/, "") : "";
    const model = typeof channel.model === "string" ? channel.model.trim() : "";

    return Boolean(
      apiKey ||
        id !== DEFAULT_OPENAI_CHANNEL_ID ||
        baseUrl !== DEFAULT_OPENAI_BASE_URL ||
        (model && model !== legacyModel) ||
        channel.enabled === false ||
        Number(channel.timeoutSeconds) !== 120,
    );
  });
}

function submittedChannelsHaveBlankApiKey(inputChannels: SaveAdminSettingsInput["openaiCompatibleChannels"]) {
  return Array.isArray(inputChannels) && inputChannels.some((channel) => !(typeof channel.apiKey === "string" && channel.apiKey.trim()));
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

function getEmailAdminSettings(map: Map<string, SettingRow>) {
  return {
    emailSmtpEnabled: normalizeBoolean(map.get("emailSmtpEnabled")?.value, normalizeBoolean(process.env.EMAIL_SMTP_ENABLED, defaultEmailSettings.enabled)),
    emailSmtpHost: normalizeOptionalText(map.get("emailSmtpHost")?.value ?? process.env.EMAIL_SMTP_HOST, defaultEmailSettings.host, 300),
    emailSmtpPort: normalizePort(map.get("emailSmtpPort")?.value ?? process.env.EMAIL_SMTP_PORT, defaultEmailSettings.port),
    emailSmtpSecure: normalizeBoolean(map.get("emailSmtpSecure")?.value, normalizeBoolean(process.env.EMAIL_SMTP_SECURE, defaultEmailSettings.secure)),
    emailSmtpUser: normalizeOptionalText(map.get("emailSmtpUser")?.value ?? process.env.EMAIL_SMTP_USER, defaultEmailSettings.username, 254),
    emailFromEmail: normalizeEmailAddress(map.get("emailFromEmail")?.value ?? process.env.EMAIL_FROM_EMAIL, defaultEmailSettings.fromEmail),
    emailFromName: normalizeText(map.get("emailFromName")?.value ?? process.env.EMAIL_FROM_NAME, defaultEmailSettings.fromName, 80),
    emailReplyTo: normalizeEmailAddress(map.get("emailReplyTo")?.value ?? process.env.EMAIL_REPLY_TO, defaultEmailSettings.replyTo),
    emailTestRecipient: normalizeEmailAddress(map.get("emailTestRecipient")?.value ?? process.env.EMAIL_TEST_RECIPIENT, defaultEmailSettings.testRecipient),
    emailSmtpPasswordConfigured: Boolean(map.get("emailSmtpPassword")?.value || process.env.EMAIL_SMTP_PASSWORD),
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

async function upsertSettings(settings: SettingWrite[]) {
  if (!process.env.DATABASE_URL) {
    throw new Error("缺少 DATABASE_URL，无法保存后台配置。");
  }

  const { Prisma } = await import("@prisma/client");
  const { prisma } = await import("@/lib/db");

  await prisma.$transaction(async (tx) => {
    for (const setting of settings) {
      await tx.$executeRaw(
        Prisma.sql`INSERT INTO "AppSetting" (id, "key", "value", "isEncrypted", "createdAt", "updatedAt")
          VALUES (${createId()}, ${setting.key}, ${setting.value}, ${Boolean(setting.isEncrypted)}, now(), now())
          ON CONFLICT ("key")
          DO UPDATE SET "value" = EXCLUDED."value", "isEncrypted" = EXCLUDED."isEncrypted", "updatedAt" = now()`,
      );
    }
  });
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
  openaiCompatibleChannels: OpenAICompatibleChannelSetting[],
  deepseekApiKeyConfigured: boolean,
  openaiApiKeyConfigured: boolean,
  stabilityAiApiKeyConfigured: boolean,
  moderation: ModerationRuntimeConfig,
  emailSettings: ReturnType<typeof getEmailAdminSettings>,
): Promise<AdminDiagnosticItem[]> {
  const encryptionReady = hasSettingsEncryptionKey();
  const providerIsOpenAI = settings.defaultGenerationProvider === "openai";
  const providerIsChatGPTWeb = settings.defaultGenerationProvider === "chatgpt_web";
  const providerIsStabilityAi = settings.defaultGenerationProvider === "stability_ai";
  const enabledOpenAIChannels = openaiCompatibleChannels.filter((channel) => channel.enabled);
  const configuredOpenAIChannels = enabledOpenAIChannels.filter((channel) => channel.apiKeyConfigured);
  const emailAuthReady = !emailSettings.emailSmtpUser || emailSettings.emailSmtpPasswordConfigured;
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
      label: "OpenAI 兼容生图",
      status: openaiApiKeyConfigured ? "ok" : providerIsOpenAI ? "error" : "warning",
      message: openaiApiKeyConfigured
        ? `已配置 ${configuredOpenAIChannels.length}/${enabledOpenAIChannels.length || openaiCompatibleChannels.length} 个启用通道。`
        : "未配置可用 OpenAI 兼容通道 API Key，OpenAI 通道不可用。",
    },
    {
      key: "stability_ai",
      label: "Stability AI 生图",
      status: stabilityAiApiKeyConfigured ? "ok" : providerIsStabilityAi ? "error" : "warning",
      message: stabilityAiApiKeyConfigured ? `已配置 ${settings.stabilityAiModel}，支持参考图 img2img。` : "未配置 Stability AI API Key，Stability AI 通道不可用。",
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
      status:
        (providerIsOpenAI && !openaiApiKeyConfigured) ||
        (providerIsChatGPTWeb && !settings.chatgptWebEnabled) ||
        (providerIsStabilityAi && !stabilityAiApiKeyConfigured)
          ? "error"
          : "ok",
      message: providerIsChatGPTWeb ? "默认使用 ChatGPT Web 本机浏览器通道。" : providerIsStabilityAi ? "默认使用 Stability AI 通道。" : "默认使用 OpenAI 官方 API。",
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
    {
      key: "email",
      label: "邮件发信",
      status:
        !emailSettings.emailSmtpEnabled
          ? "warning"
          : emailSettings.emailSmtpHost && emailSettings.emailFromEmail && emailAuthReady
            ? "ok"
            : "error",
      message: !emailSettings.emailSmtpEnabled
        ? "SMTP 发信未启用，注册通知、测试邮件等邮件能力不可用。"
        : emailSettings.emailSmtpHost && emailSettings.emailFromEmail && emailAuthReady
          ? `SMTP 已启用：${emailSettings.emailSmtpHost}:${emailSettings.emailSmtpPort}。`
          : "SMTP 已启用，但 Host、发件邮箱或 SMTP 认证信息未配置完整。",
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
  const openaiImageModel = normalizeText(getStoredSetting(map, "openaiImageModel") || process.env.OPENAI_IMAGE_MODEL, defaultSettings.openaiImageModel);

  return {
    browserTitle: normalizeText(getStoredSetting(map, "browserTitle"), defaultSettings.browserTitle),
    siteTitle: normalizeText(getStoredSetting(map, "siteTitle"), defaultSettings.siteTitle),
    siteSubtitle: normalizeText(getStoredSetting(map, "siteSubtitle"), defaultSettings.siteSubtitle),
    siteLogoUrl: normalizeAssetUrl(getStoredSetting(map, "siteLogoUrl"), defaultSettings.siteLogoUrl),
    siteFaviconUrl: normalizeAssetUrl(getStoredSetting(map, "siteFaviconUrl"), defaultSettings.siteFaviconUrl),
    frontTemplate: normalizeFrontTemplate(getStoredSetting(map, "frontTemplate") || defaultSettings.frontTemplate),
    homePopup: normalizeHomePopupSettings(getStoredSetting(map, "homePopup"), defaultSettings.homePopup),
    icpNumber: normalizeOptionalText(getStoredSetting(map, "icpNumber"), defaultSettings.icpNumber, 120),
    friendLinks: normalizeFriendLinks(getStoredSetting(map, "friendLinks"), defaultSettings.friendLinks),
    defaultGenerationProvider: normalizeProvider(
      getStoredSetting(map, "defaultGenerationProvider") || process.env.DEFAULT_GENERATION_PROVIDER || defaultSettings.defaultGenerationProvider,
    ),
    deepseekBaseUrl: normalizeText(getStoredSetting(map, "deepseekBaseUrl") || process.env.DEEPSEEK_BASE_URL, defaultSettings.deepseekBaseUrl, 200),
    deepseekModel: normalizeText(getStoredSetting(map, "deepseekModel") || process.env.DEEPSEEK_MODEL, defaultSettings.deepseekModel),
    openaiImageModel,
    stabilityAiModel: normalizeText(getStoredSetting(map, "stabilityAiModel") || process.env.STABILITY_AI_MODEL, defaultSettings.stabilityAiModel),
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
    storagePublicBaseUrl: normalizeOptionalText(getStoredSetting(map, "storagePublicBaseUrl") || process.env.STORAGE_PUBLIC_BASE_URL, defaultSettings.storagePublicBaseUrl, 300),
    storageGeneratedPrefix: normalizeStoragePrefix(getStoredSetting(map, "storageGeneratedPrefix") || process.env.STORAGE_GENERATED_PREFIX, defaultSettings.storageGeneratedPrefix),
    storageUploadsPrefix: normalizeStoragePrefix(getStoredSetting(map, "storageUploadsPrefix") || process.env.STORAGE_UPLOADS_PREFIX, defaultSettings.storageUploadsPrefix),
    storageEndpoint: normalizeOptionalText(getStoredSetting(map, "storageEndpoint") || process.env.STORAGE_ENDPOINT, defaultSettings.storageEndpoint, 300),
    storageBucket: normalizeOptionalText(getStoredSetting(map, "storageBucket") || process.env.STORAGE_BUCKET, defaultSettings.storageBucket, 160),
    storageRegion: normalizeOptionalText(getStoredSetting(map, "storageRegion") || process.env.STORAGE_REGION, defaultSettings.storageRegion, 120),
  };
}

export async function getOpenAICompatibleChannelSettings(): Promise<OpenAICompatibleChannelSetting[]> {
  const map = toMap(await readSettingRows());
  const openaiImageModel = normalizeText(getStoredSetting(map, "openaiImageModel") || process.env.OPENAI_IMAGE_MODEL, defaultSettings.openaiImageModel);
  return toPublicOpenAICompatibleChannels(map, { openaiImageModel });
}

export async function getAdminAppSettings(): Promise<AdminAppSettings> {
  const map = toMap(await readSettingRows());
  const publicSettings = await getPublicAppSettings();
  const openaiCompatibleChannels = toPublicOpenAICompatibleChannels(map, { openaiImageModel: publicSettings.openaiImageModel });
  const moderationSettings = getModerationSettings(map);
  const emailSettings = getEmailAdminSettings(map);
  const deepseekApiKeyConfigured = Boolean(map.get("deepseekApiKey")?.value || process.env.DEEPSEEK_API_KEY);
  const legacyOpenaiApiKeyConfigured = Boolean(map.get("openaiApiKey")?.value || process.env.OPENAI_API_KEY);
  const openaiApiKeyConfigured = openaiCompatibleChannels.some((channel) => channel.enabled && channel.apiKeyConfigured);
  const stabilityAiApiKeyConfigured = Boolean(map.get("stabilityAiApiKey")?.value || process.env.STABILITY_AI_API_KEY);

  return {
    ...publicSettings,
    openaiCompatibleChannels,
    deepseekPolishPrompt: normalizeText(getStoredSetting(map, "deepseekPolishPrompt"), defaultDeepSeekPolishPrompt, 6000),
    moderationEnabled: moderationSettings.enabled,
    moderationForbiddenWords: moderationSettings.forbiddenWords,
    moderationBlockMessage: moderationSettings.blockMessage,
    ...emailSettings,
    deepseekApiKeyConfigured,
    openaiApiKeyConfigured,
    legacyOpenaiApiKeyConfigured,
    stabilityAiApiKeyConfigured,
    encryptionReady: hasSettingsEncryptionKey(),
    diagnostics: await buildDiagnostics(publicSettings, openaiCompatibleChannels, deepseekApiKeyConfigured, openaiApiKeyConfigured, stabilityAiApiKeyConfigured, moderationSettings, emailSettings),
  };
}

export async function saveAdminAppSettings(input: SaveAdminSettingsInput) {
  const settingsMap = toMap(await readSettingRows());
  const openAICompatibleChannelsRow = settingsMap.get("openaiCompatibleChannels");
  const canReadStoredOpenAICompatibleChannels = canDecryptSetting(openAICompatibleChannelsRow);
  const currentPublicSettings = await getPublicAppSettings();
  const currentModerationSettings = getModerationSettings(settingsMap);
  const currentEmailSettings = getEmailAdminSettings(settingsMap);
  const browserTitle = normalizeText(input.browserTitle, currentPublicSettings.browserTitle);
  const siteTitle = normalizeText(input.siteTitle, currentPublicSettings.siteTitle);
  const siteSubtitle = normalizeText(input.siteSubtitle, currentPublicSettings.siteSubtitle);
  const siteLogoUrl = normalizeAssetUrl(input.siteLogoUrl, currentPublicSettings.siteLogoUrl);
  const siteFaviconUrl = normalizeAssetUrl(input.siteFaviconUrl, currentPublicSettings.siteFaviconUrl);
  const frontTemplate = normalizeFrontTemplate(input.frontTemplate || currentPublicSettings.frontTemplate);
  const homePopup = normalizeHomePopupSettings(input.homePopup, currentPublicSettings.homePopup);
  const icpNumber = normalizeOptionalText(input.icpNumber, currentPublicSettings.icpNumber, 120);
  const friendLinks = normalizeFriendLinks(input.friendLinks, currentPublicSettings.friendLinks);
  const deepseekBaseUrl = normalizeText(input.deepseekBaseUrl, currentPublicSettings.deepseekBaseUrl, 200);
  const deepseekModel = normalizeText(input.deepseekModel, currentPublicSettings.deepseekModel);
  const openaiImageModel = normalizeText(input.openaiImageModel, currentPublicSettings.openaiImageModel);
  const stabilityAiModel = normalizeText(input.stabilityAiModel, currentPublicSettings.stabilityAiModel);
  const deepseekPolishPrompt = normalizeText(input.deepseekPolishPrompt, getStoredSetting(settingsMap, "deepseekPolishPrompt") || defaultDeepSeekPolishPrompt, 6000);
  const moderationEnabled = normalizeBoolean(input.moderationEnabled, currentModerationSettings.enabled);
  const moderationForbiddenWords =
    typeof input.moderationForbiddenWords === "string"
      ? normalizeForbiddenWords(input.moderationForbiddenWords)
      : currentModerationSettings.forbiddenWords;
  const moderationBlockMessage = normalizeText(
    input.moderationBlockMessage,
    currentModerationSettings.blockMessage,
    200,
  );
  const defaultGenerationProvider = normalizeProvider(input.defaultGenerationProvider || currentPublicSettings.defaultGenerationProvider);
  const chatgptWebEnabled = normalizeBoolean(input.chatgptWebEnabled, currentPublicSettings.chatgptWebEnabled);
  const chatgptWebUserDataDir = normalizeText(input.chatgptWebUserDataDir, currentPublicSettings.chatgptWebUserDataDir, 300);
  const chatgptWebHeadless = normalizeBoolean(input.chatgptWebHeadless, currentPublicSettings.chatgptWebHeadless);
  const chatgptWebTimeoutSeconds = normalizeTimeoutSeconds(input.chatgptWebTimeoutSeconds, currentPublicSettings.chatgptWebTimeoutSeconds);
  const storageProvider = normalizeStorageProvider(input.storageProvider || currentPublicSettings.storageProvider);
  const storageLocalBaseDir = normalizeText(input.storageLocalBaseDir, currentPublicSettings.storageLocalBaseDir, 300);
  const storagePublicBaseUrl = normalizeOptionalText(input.storagePublicBaseUrl, currentPublicSettings.storagePublicBaseUrl, 300);
  const storageGeneratedPrefix = normalizeStoragePrefix(input.storageGeneratedPrefix, currentPublicSettings.storageGeneratedPrefix);
  const storageUploadsPrefix = normalizeStoragePrefix(input.storageUploadsPrefix, currentPublicSettings.storageUploadsPrefix);
  const storageEndpoint = normalizeOptionalText(input.storageEndpoint, currentPublicSettings.storageEndpoint, 300);
  const storageBucket = normalizeOptionalText(input.storageBucket, currentPublicSettings.storageBucket, 160);
  const storageRegion = normalizeOptionalText(input.storageRegion, currentPublicSettings.storageRegion, 120);
  const emailSmtpEnabled = normalizeBoolean(input.emailSmtpEnabled, currentEmailSettings.emailSmtpEnabled);
  const emailSmtpHost = normalizeOptionalText(input.emailSmtpHost, currentEmailSettings.emailSmtpHost, 300);
  const emailSmtpPort = normalizePort(input.emailSmtpPort, currentEmailSettings.emailSmtpPort);
  const emailSmtpSecure = normalizeBoolean(input.emailSmtpSecure, currentEmailSettings.emailSmtpSecure);
  const emailSmtpUser = normalizeOptionalText(input.emailSmtpUser, currentEmailSettings.emailSmtpUser, 254);
  const emailFromEmail = normalizeSubmittedEmailAddress(input.emailFromEmail, currentEmailSettings.emailFromEmail, "发件邮箱");
  const emailFromName = normalizeText(input.emailFromName, currentEmailSettings.emailFromName, 80);
  const emailReplyTo = normalizeSubmittedEmailAddress(input.emailReplyTo, currentEmailSettings.emailReplyTo, "回复邮箱");
  const emailTestRecipient = normalizeSubmittedEmailAddress(input.emailTestRecipient, currentEmailSettings.emailTestRecipient, "测试收件邮箱");
  const submittedDeepSeekApiKey = normalizeSubmittedSecret(input.deepseekApiKey);
  const submittedOpenaiApiKey = normalizeSubmittedSecret(input.openaiApiKey);
  const submittedStabilityAiApiKey = normalizeSubmittedSecret(input.stabilityAiApiKey);
  const submittedEmailSmtpPassword = normalizeSubmittedSecret(input.emailSmtpPassword);
  const shouldSaveOpenAICompatibleChannels = shouldPersistSubmittedOpenAIChannels(input.openaiCompatibleChannels, settingsMap, openaiImageModel);
  if (shouldSaveOpenAICompatibleChannels && !canReadStoredOpenAICompatibleChannels && submittedChannelsHaveBlankApiKey(input.openaiCompatibleChannels)) {
    throw new AppError(
      "PROVIDER_CONFIG",
      "已保存的 OpenAI 兼容通道无法解密。请修复 SETTINGS_ENCRYPTION_KEY，或为所有通道重新填写 API Key 后再保存。",
      400,
    );
  }

  const openaiCompatibleChannels = shouldSaveOpenAICompatibleChannels
    ? normalizeSubmittedOpenAIChannels(
        input.openaiCompatibleChannels,
        canReadStoredOpenAICompatibleChannels ? parseStoredOpenAICompatibleChannels(settingsMap) : [],
        getEncryptedSettingValue(settingsMap.get("openaiApiKey")) || process.env.OPENAI_API_KEY || "",
      )
    : null;
  const shouldSaveEncryptedSettings = Boolean(
    submittedDeepSeekApiKey ||
      submittedOpenaiApiKey ||
      submittedStabilityAiApiKey ||
      submittedEmailSmtpPassword ||
      openaiCompatibleChannels,
  );

  if (shouldSaveEncryptedSettings && !hasSettingsEncryptionKey()) {
    throw new AppError("PROVIDER_CONFIG", "缺少 SETTINGS_ENCRYPTION_KEY，无法保存敏感配置。", 400);
  }

  const settingsToSave: SettingWrite[] = [
    { key: "browserTitle", value: browserTitle },
    { key: "siteTitle", value: siteTitle },
    { key: "siteSubtitle", value: siteSubtitle },
    { key: "siteLogoUrl", value: siteLogoUrl },
    { key: "siteFaviconUrl", value: siteFaviconUrl },
    { key: "frontTemplate", value: frontTemplate },
    { key: "homePopup", value: JSON.stringify(homePopup) },
    { key: "icpNumber", value: icpNumber },
    { key: "friendLinks", value: JSON.stringify(friendLinks) },
    { key: "deepseekBaseUrl", value: deepseekBaseUrl },
    { key: "deepseekModel", value: deepseekModel },
    { key: "openaiImageModel", value: openaiImageModel },
    { key: "stabilityAiModel", value: stabilityAiModel },
    { key: "deepseekPolishPrompt", value: deepseekPolishPrompt },
    { key: "moderationEnabled", value: String(moderationEnabled) },
    { key: "moderationForbiddenWords", value: moderationForbiddenWords },
    { key: "moderationBlockMessage", value: moderationBlockMessage },
    { key: "defaultGenerationProvider", value: defaultGenerationProvider },
    { key: "chatgptWebEnabled", value: String(chatgptWebEnabled) },
    { key: "chatgptWebUserDataDir", value: chatgptWebUserDataDir },
    { key: "chatgptWebHeadless", value: String(chatgptWebHeadless) },
    { key: "chatgptWebTimeoutSeconds", value: String(chatgptWebTimeoutSeconds) },
    { key: "storageProvider", value: storageProvider },
    { key: "storageLocalBaseDir", value: storageLocalBaseDir },
    { key: "storagePublicBaseUrl", value: storagePublicBaseUrl },
    { key: "storageGeneratedPrefix", value: storageGeneratedPrefix },
    { key: "storageUploadsPrefix", value: storageUploadsPrefix },
    { key: "storageEndpoint", value: storageEndpoint },
    { key: "storageBucket", value: storageBucket },
    { key: "storageRegion", value: storageRegion },
    { key: "emailSmtpEnabled", value: String(emailSmtpEnabled) },
    { key: "emailSmtpHost", value: emailSmtpHost },
    { key: "emailSmtpPort", value: String(emailSmtpPort) },
    { key: "emailSmtpSecure", value: String(emailSmtpSecure) },
    { key: "emailSmtpUser", value: emailSmtpUser },
    { key: "emailFromEmail", value: emailFromEmail },
    { key: "emailFromName", value: emailFromName },
    { key: "emailReplyTo", value: emailReplyTo },
    { key: "emailTestRecipient", value: emailTestRecipient },
  ];

  if (submittedDeepSeekApiKey) {
    settingsToSave.push({ key: "deepseekApiKey", value: encryptSecret(submittedDeepSeekApiKey), isEncrypted: true });
  }

  if (submittedOpenaiApiKey) {
    settingsToSave.push({ key: "openaiApiKey", value: encryptSecret(submittedOpenaiApiKey), isEncrypted: true });
  }

  if (openaiCompatibleChannels) {
    settingsToSave.push({ key: "openaiCompatibleChannels", value: encryptSecret(JSON.stringify(openaiCompatibleChannels)), isEncrypted: true });
  }

  if (submittedStabilityAiApiKey) {
    settingsToSave.push({ key: "stabilityAiApiKey", value: encryptSecret(submittedStabilityAiApiKey), isEncrypted: true });
  }

  if (submittedEmailSmtpPassword) {
    settingsToSave.push({ key: "emailSmtpPassword", value: encryptSecret(submittedEmailSmtpPassword), isEncrypted: true });
  }

  await upsertSettings(settingsToSave);
}

async function getSecretValue(key: "deepseekApiKey" | "openaiApiKey" | "stabilityAiApiKey" | "emailSmtpPassword", envValue?: string) {
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

export async function getOpenAICompatibleRuntimeChannels(): Promise<OpenAICompatibleRuntimeChannel[]> {
  const map = toMap(await readSettingRows());
  const settings = await getPublicAppSettings();
  const storedChannels = parseStoredOpenAICompatibleChannels(map);

  if (storedChannels.length) {
    return storedChannels
      .filter((channel) => channel.enabled)
      .map(({ apiKey, ...channel }) => ({
        ...channel,
        apiKey,
      }))
      .sort((left, right) => left.priority - right.priority);
  }

  return [
    {
      id: DEFAULT_OPENAI_CHANNEL_ID,
      name: "OpenAI 官方 API",
      enabled: true,
      baseUrl: DEFAULT_OPENAI_BASE_URL,
      model: settings.openaiImageModel,
      timeoutSeconds: 120,
      priority: 0,
      apiKey: await getSecretValue("openaiApiKey", process.env.OPENAI_API_KEY),
    },
  ];
}

export async function getStabilityAiRuntimeConfig() {
  const settings = await getPublicAppSettings();

  return {
    apiKey: await getSecretValue("stabilityAiApiKey", process.env.STABILITY_AI_API_KEY),
    model: settings.stabilityAiModel,
  };
}

export async function getChatGPTWebRuntimeConfig(): Promise<ChatGPTWebRuntimeConfig> {
  const settings = await getPublicAppSettings();

  let headless = settings.chatgptWebHeadless;
  if (process.env.CHATGPT_WEB_HEADLESS !== undefined) {
    headless = normalizeBoolean(process.env.CHATGPT_WEB_HEADLESS, false);
  } else if (process.platform === "linux" && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    headless = true;
  }

  return {
    enabled: settings.chatgptWebEnabled,
    userDataDir: resolveLocalPath(settings.chatgptWebUserDataDir),
    headless,
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

export async function getEmailRuntimeConfig(): Promise<EmailRuntimeConfig> {
  const map = toMap(await readSettingRows());
  const settings = getEmailAdminSettings(map);

  return {
    enabled: settings.emailSmtpEnabled,
    host: settings.emailSmtpHost,
    port: settings.emailSmtpPort,
    secure: settings.emailSmtpSecure,
    username: settings.emailSmtpUser,
    password: await getSecretValue("emailSmtpPassword", process.env.EMAIL_SMTP_PASSWORD),
    fromEmail: settings.emailFromEmail,
    fromName: settings.emailFromName,
    replyTo: settings.emailReplyTo,
    testRecipient: settings.emailTestRecipient,
  };
}

export async function getModerationRuntimeConfig(): Promise<ModerationRuntimeConfig> {
  return getModerationSettings(toMap(await readSettingRows()));
}
