import { existsSync } from "fs";
import path from "path";

import { isUsableSecret } from "@/lib/app-crypto";
import { prisma } from "@/lib/db";
import { getPaymentDiagnostics } from "@/lib/payment-diagnostics";
import { getOpenAICompatibleChannelSettings, getPublicAppSettings, getStorageRuntimeConfig } from "@/lib/settings";

export type AdminHealthStatus = "ok" | "warning" | "error";

export type AdminHealthItem = {
  id: string;
  label: string;
  status: AdminHealthStatus;
  description: string;
  detail?: string;
};

export type AdminHealthReport = {
  generatedAt: string;
  summary: Record<AdminHealthStatus, number>;
  items: AdminHealthItem[];
  paymentDiagnostics: Awaited<ReturnType<typeof getPaymentDiagnostics>>;
};

function makeItem(item: AdminHealthItem) {
  return item;
}

function summarize(items: AdminHealthItem[]) {
  return items.reduce<Record<AdminHealthStatus, number>>(
    (total, item) => {
      total[item.status] += 1;
      return total;
    },
    {
      ok: 0,
      warning: 0,
      error: 0,
    },
  );
}

function isLocalOrigin(origin: string) {
  return origin.includes("127.0.0.1") || origin.includes("localhost");
}

function isUsableAdminBootstrap(email?: string, password?: string) {
  return Boolean(email && email !== "admin@example.com" && isUsableSecret(password, 12));
}

export async function getAdminHealthReport(originValue?: string | null): Promise<AdminHealthReport> {
  const items: AdminHealthItem[] = [];
  const publicOrigin = originValue || process.env.NEXT_PUBLIC_SITE_URL || "";

  if (!process.env.DATABASE_URL) {
    items.push(
      makeItem({
        id: "database",
        label: "数据库连接",
        status: "error",
        description: "缺少 DATABASE_URL，登录、积分、订单和任务都会不可用。",
      }),
    );
  } else {
    try {
      await prisma.$queryRaw`SELECT 1`;
      items.push(
        makeItem({
          id: "database",
          label: "数据库连接",
          status: "ok",
          description: "PostgreSQL 可连接，Prisma 查询正常。",
        }),
      );
    } catch {
      items.push(
        makeItem({
          id: "database",
          label: "数据库连接",
          status: "error",
          description: "数据库连接失败，请检查 DATABASE_URL、PostgreSQL 服务和迁移状态。",
        }),
      );
    }
  }

  const authSecret = process.env.AUTH_SECRET || "";
  const authSecretReady = isUsableSecret(authSecret);
  items.push(
    makeItem({
      id: "auth-secret",
      label: "登录会话密钥",
      status: authSecretReady ? "ok" : "error",
      description: authSecretReady ? "AUTH_SECRET 已配置，登录 Cookie 可正常签名。" : "AUTH_SECRET 缺失、长度不足或仍为示例值，生产环境必须更换。",
    }),
  );

  const encryptionKey = process.env.SETTINGS_ENCRYPTION_KEY || "";
  const encryptionKeyReady = isUsableSecret(encryptionKey);
  items.push(
    makeItem({
      id: "settings-encryption",
      label: "后台密钥加密",
      status: encryptionKeyReady ? "ok" : "error",
      description: encryptionKeyReady ? "SETTINGS_ENCRYPTION_KEY 已配置，可保存 API Key 和支付密钥。" : "SETTINGS_ENCRYPTION_KEY 缺失、长度不足或仍为示例值，后台不能安全保存敏感配置。",
    }),
  );

  const adminReady = isUsableAdminBootstrap(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  items.push(
    makeItem({
      id: "admin-bootstrap",
      label: "初始管理员",
      status: adminReady ? "ok" : "warning",
      description: adminReady ? "ADMIN_EMAIL 和 ADMIN_PASSWORD 已配置。" : "初始管理员邮箱或密码缺失、过短或仍为示例值，新环境初始化管理员会受影响。",
    }),
  );

  items.push(
    makeItem({
      id: "public-origin",
      label: "公网访问地址",
      status: publicOrigin && !isLocalOrigin(publicOrigin) ? "ok" : "warning",
      description: publicOrigin && !isLocalOrigin(publicOrigin) ? "NEXT_PUBLIC_SITE_URL 指向公网地址，适合支付回调联调。" : "当前未配置公网地址或仍是本地地址，线上支付平台无法回调本机地址。",
      detail: publicOrigin || "未配置",
    }),
  );

  const storageConfig = await getStorageRuntimeConfig();
  const generatedDir = path.join(storageConfig.localBaseDir, storageConfig.generatedPrefix);
  items.push(
    makeItem({
      id: "generated-storage",
      label: "图片存储",
      status: storageConfig.provider === "local" && existsSync(generatedDir) ? "ok" : "warning",
      description:
        storageConfig.provider === "local"
          ? existsSync(generatedDir)
            ? `local 存储目录已存在：${generatedDir}`
            : `local 存储目录尚不存在，首次保存图片时会自动创建：${generatedDir}`
          : `${storageConfig.provider} 已预留配置，当前版本仍建议使用 local 存储。`,
    }),
  );

  const appSettings = await getPublicAppSettings();
  const openAIChannels = await getOpenAICompatibleChannelSettings();
  const enabledOpenAIChannels = openAIChannels.filter((channel) => channel.enabled);
  const readyOpenAIChannels = enabledOpenAIChannels.filter((channel) => channel.apiKeyConfigured && channel.baseUrl && channel.model);
  items.push(
    makeItem({
      id: "openai-compatible-channels",
      label: "OpenAI 兼容通道",
      status: readyOpenAIChannels.length > 0 ? "ok" : appSettings.defaultGenerationProvider === "openai" ? "error" : "warning",
      description:
        readyOpenAIChannels.length > 0
          ? `已有 ${readyOpenAIChannels.length}/${enabledOpenAIChannels.length || openAIChannels.length} 个启用通道配置完整。`
          : "暂无启用且配置完整的 OpenAI 兼容通道。",
    }),
  );

  const paymentDiagnostics = await getPaymentDiagnostics(publicOrigin || originValue);
  const enabledProviders = paymentDiagnostics.filter((setting) => setting.enabled);
  const readyProviders = enabledProviders.filter((setting) => setting.configured);
  items.push(
    makeItem({
      id: "payment-providers",
      label: "在线支付渠道",
      status: readyProviders.length > 0 ? "ok" : enabledProviders.length > 0 ? "warning" : "warning",
      description: readyProviders.length > 0 ? `已有 ${readyProviders.length} 个支付渠道启用且配置完整。` : enabledProviders.length > 0 ? "存在已启用但未配置完整的支付渠道。" : "暂无启用且配置完整的支付渠道。",
    }),
  );

  const callbackIssueCount = paymentDiagnostics.reduce((total, item) => total + item.issues.length, 0);
  items.push(
    makeItem({
      id: "payment-callback",
      label: "支付回调地址",
      status: callbackIssueCount === 0 ? "ok" : "warning",
      description: callbackIssueCount === 0 ? "支付回调地址未发现明显问题。" : `支付诊断发现 ${callbackIssueCount} 个配置提示，请在支付联调面板查看。`,
    }),
  );

  return {
    generatedAt: new Date().toISOString(),
    summary: summarize(items),
    items,
    paymentDiagnostics,
  };
}
