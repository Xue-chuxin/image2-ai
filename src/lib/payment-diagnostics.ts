import { createHash } from "crypto";

import { getBillingPaymentSettings } from "@/lib/billing";
import { prisma } from "@/lib/db";
import type { PaymentProviderName } from "@/lib/payments";

export type PaymentEventStatus = "RECEIVED" | "VERIFIED" | "FAILED" | "IGNORED";

export type PaymentEventInput = {
  provider: PaymentProviderName;
  eventType: string;
  status: PaymentEventStatus;
  orderNo?: string | null;
  providerTradeNo?: string | null;
  httpMethod?: string | null;
  requestPath?: string | null;
  rawPayload?: unknown;
  message?: string | null;
};

export type PaymentDiagnosticItem = {
  provider: PaymentProviderName;
  label: string;
  enabled: boolean;
  configured: boolean;
  notifyUrl: string;
  returnUrl: string;
  issues: string[];
};

const PROVIDER_LABELS: Record<PaymentProviderName, string> = {
  epay: "易支付",
  alipay_f2f: "支付宝当面付",
  wechat_pay: "微信支付",
  paypal: "PayPal",
};

const MAX_RAW_PAYLOAD_LENGTH = 4000;

function stringifyPayload(payload: unknown) {
  if (payload === undefined || payload === null) {
    return "";
  }

  if (typeof payload === "string") {
    return payload;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

function truncatePayload(payload: unknown) {
  const value = stringifyPayload(payload).trim();
  if (!value) {
    return null;
  }
  return value.length > MAX_RAW_PAYLOAD_LENGTH ? `${value.slice(0, MAX_RAW_PAYLOAD_LENGTH)}...` : value;
}

export function createPaymentPayloadDigest(payload: unknown) {
  const value = stringifyPayload(payload);
  if (!value) {
    return null;
  }
  return createHash("sha256").update(value).digest("hex");
}

export async function recordPaymentEvent(input: PaymentEventInput) {
  return prisma.paymentEvent.create({
    data: {
      provider: input.provider,
      eventType: input.eventType,
      status: input.status,
      orderNo: input.orderNo || null,
      providerTradeNo: input.providerTradeNo || null,
      httpMethod: input.httpMethod || null,
      requestPath: input.requestPath || null,
      payloadDigest: createPaymentPayloadDigest(input.rawPayload),
      message: input.message || null,
      rawPayload: truncatePayload(input.rawPayload),
    },
  });
}

export async function listAdminPaymentEvents(input: { provider?: string | null; status?: string | null; q?: string | null; limit?: number } = {}) {
  const limit = Math.min(Math.max(Number(input.limit || 80), 1), 200);
  const q = input.q?.trim();

  return prisma.paymentEvent.findMany({
    where: {
      provider: input.provider || undefined,
      status: input.status || undefined,
      OR: q
        ? [
            {
              orderNo: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              providerTradeNo: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              message: {
                contains: q,
                mode: "insensitive",
              },
            },
          ]
        : undefined,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

function joinUrl(origin: string, path: string) {
  const safeOrigin = origin.replace(/\/+$/, "");
  return `${safeOrigin}${path}`;
}

function getOrigin(input?: string | null) {
  const value = input?.trim();
  if (value) {
    return value.replace(/\/+$/, "");
  }
  return "http://127.0.0.1:3000";
}

export async function getPaymentDiagnostics(originValue?: string | null): Promise<PaymentDiagnosticItem[]> {
  const settings = await getBillingPaymentSettings();
  const origin = getOrigin(originValue);

  return (Object.keys(PROVIDER_LABELS) as PaymentProviderName[]).map((provider) => {
    const config = settings[provider] || {
      enabled: false,
      configured: false,
    };
    const issues: string[] = [];

    if (!config.enabled) {
      issues.push("后台未启用该支付渠道");
    }
    if (!config.configured) {
      issues.push("商户参数或密钥未配置完整");
    }
    if (origin.includes("127.0.0.1") || origin.includes("localhost")) {
      issues.push("本地地址不能作为线上支付回调地址，联调时需要公网可访问域名");
    }
    if (provider === "paypal") {
      issues.push("PayPal 当前使用返回页 capture 流程，Webhook 后续单独接入");
    }

    return {
      provider,
      label: PROVIDER_LABELS[provider],
      enabled: config.enabled,
      configured: config.configured,
      notifyUrl: joinUrl(origin, `/api/payments/notify/${provider}`),
      returnUrl: joinUrl(origin, `/api/payments/return/${provider}`),
      issues,
    };
  });
}
