import { createDecipheriv, createHash, createSign, createVerify, randomBytes } from "crypto";

import { decryptSecret, encryptSecret } from "@/lib/app-crypto";
import { prisma } from "@/lib/db";

export type PaymentProviderName = "epay" | "alipay_f2f" | "wechat_pay" | "paypal";
export type PaymentMode = "sandbox" | "production";

export type PaymentProviderSettings = {
  epay: {
    enabled: boolean;
    displayName: string;
    gatewayUrl: string;
    pid: string;
    defaultType: string;
    keyConfigured: boolean;
    key?: string;
  };
  alipayF2f: {
    enabled: boolean;
    displayName: string;
    gatewayUrl: string;
    appId: string;
    privateKeyConfigured: boolean;
    alipayPublicKeyConfigured: boolean;
    privateKey?: string;
    alipayPublicKey?: string;
  };
  wechatPay: {
    enabled: boolean;
    displayName: string;
    mchId: string;
    appId: string;
    serialNo: string;
    privateKeyConfigured: boolean;
    apiV3KeyConfigured: boolean;
    platformPublicKeyConfigured: boolean;
    privateKey?: string;
    apiV3Key?: string;
    platformPublicKey?: string;
  };
  paypal: {
    enabled: boolean;
    displayName: string;
    mode: PaymentMode;
    clientId: string;
    secretConfigured: boolean;
    secret?: string;
  };
};

export type PaymentChannelView = {
  provider: PaymentProviderName;
  label: string;
  enabled: boolean;
  configured: boolean;
  mode?: PaymentMode;
};

type SettingRow = {
  key: string;
  value: string;
  isEncrypted: boolean;
};

type PaymentOrderInput = {
  id: string;
  orderNo: string;
  packageNameSnapshot: string;
  amountCents: number;
  currency: string;
};

type CreatePaymentInput = {
  provider: PaymentProviderName;
  order: PaymentOrderInput;
  origin: string;
};

type PaymentCreationResult = {
  paymentUrl?: string;
  qrCodeUrl?: string;
  providerTradeNo?: string;
  providerPayload?: unknown;
};

export type PaymentNotifyResult = {
  ok: boolean;
  provider: PaymentProviderName;
  orderNo: string;
  providerTradeNo?: string | null;
  amountCents: number;
  currency?: string | null;
  rawPayload: unknown;
};

const defaultSettings: PaymentProviderSettings = {
  epay: {
    enabled: false,
    displayName: "易支付",
    gatewayUrl: "",
    pid: "",
    defaultType: "alipay",
    keyConfigured: false,
  },
  alipayF2f: {
    enabled: false,
    displayName: "支付宝当面付",
    gatewayUrl: "https://openapi.alipay.com/gateway.do",
    appId: "",
    privateKeyConfigured: false,
    alipayPublicKeyConfigured: false,
  },
  wechatPay: {
    enabled: false,
    displayName: "微信支付",
    mchId: "",
    appId: "",
    serialNo: "",
    privateKeyConfigured: false,
    apiV3KeyConfigured: false,
    platformPublicKeyConfigured: false,
  },
  paypal: {
    enabled: false,
    displayName: "PayPal",
    mode: "sandbox",
    clientId: "",
    secretConfigured: false,
  },
};

const plainSettingKeys = [
  "payment.epay.enabled",
  "payment.epay.displayName",
  "payment.epay.gatewayUrl",
  "payment.epay.pid",
  "payment.epay.defaultType",
  "payment.alipayF2f.enabled",
  "payment.alipayF2f.displayName",
  "payment.alipayF2f.gatewayUrl",
  "payment.alipayF2f.appId",
  "payment.wechatPay.enabled",
  "payment.wechatPay.displayName",
  "payment.wechatPay.mchId",
  "payment.wechatPay.appId",
  "payment.wechatPay.serialNo",
  "payment.paypal.enabled",
  "payment.paypal.displayName",
  "payment.paypal.mode",
  "payment.paypal.clientId",
] as const;

const secretSettingKeys = [
  "payment.epay.key",
  "payment.alipayF2f.privateKey",
  "payment.alipayF2f.alipayPublicKey",
  "payment.wechatPay.privateKey",
  "payment.wechatPay.apiV3Key",
  "payment.wechatPay.platformPublicKey",
  "payment.paypal.secret",
] as const;

function normalizeText(value: unknown, fallback = "", maxLength = 1000) {
  if (typeof value !== "string") {
    return fallback;
  }
  const clean = value.trim().slice(0, maxLength);
  return clean || fallback;
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const clean = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(clean)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(clean)) {
      return false;
    }
  }
  return fallback;
}

function normalizeMode(value: unknown): PaymentMode {
  return value === "production" ? "production" : "sandbox";
}

function yuanString(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}

function centsFromYuan(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return 0;
  }
  return Math.round(numberValue * 100);
}

function providerLabel(provider: PaymentProviderName, settings: PaymentProviderSettings) {
  if (provider === "epay") {
    return settings.epay.displayName;
  }
  if (provider === "alipay_f2f") {
    return settings.alipayF2f.displayName;
  }
  if (provider === "wechat_pay") {
    return settings.wechatPay.displayName;
  }
  return settings.paypal.displayName;
}

export function normalizePaymentProvider(value: unknown): PaymentProviderName {
  if (value === "epay" || value === "alipay_f2f" || value === "wechat_pay" || value === "paypal") {
    return value;
  }
  return "epay";
}

async function readPaymentSettingRows() {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [...plainSettingKeys, ...secretSettingKeys],
      },
    },
  });

  return new Map(rows.map((row) => [row.key, row as SettingRow]));
}

function getPlain(map: Map<string, SettingRow>, key: string, fallback = "") {
  return map.get(key)?.value || fallback;
}

function getSecret(map: Map<string, SettingRow>, key: string, includeSecret: boolean) {
  const row = map.get(key);
  if (!row?.value) {
    return {
      configured: false,
      value: "",
    };
  }

  return {
    configured: true,
    value: includeSecret ? (row.isEncrypted ? decryptSecret(row.value) : row.value) : "",
  };
}

async function readPaymentProviderSettings(includeSecrets: boolean): Promise<PaymentProviderSettings> {
  const map = await readPaymentSettingRows();
  const epayKey = getSecret(map, "payment.epay.key", includeSecrets);
  const alipayPrivateKey = getSecret(map, "payment.alipayF2f.privateKey", includeSecrets);
  const alipayPublicKey = getSecret(map, "payment.alipayF2f.alipayPublicKey", includeSecrets);
  const wechatPrivateKey = getSecret(map, "payment.wechatPay.privateKey", includeSecrets);
  const wechatApiV3Key = getSecret(map, "payment.wechatPay.apiV3Key", includeSecrets);
  const wechatPlatformPublicKey = getSecret(map, "payment.wechatPay.platformPublicKey", includeSecrets);
  const paypalSecret = getSecret(map, "payment.paypal.secret", includeSecrets);

  return {
    epay: {
      enabled: normalizeBoolean(getPlain(map, "payment.epay.enabled"), defaultSettings.epay.enabled),
      displayName: getPlain(map, "payment.epay.displayName", defaultSettings.epay.displayName),
      gatewayUrl: getPlain(map, "payment.epay.gatewayUrl", defaultSettings.epay.gatewayUrl),
      pid: getPlain(map, "payment.epay.pid", defaultSettings.epay.pid),
      defaultType: getPlain(map, "payment.epay.defaultType", defaultSettings.epay.defaultType),
      keyConfigured: epayKey.configured,
      key: epayKey.value,
    },
    alipayF2f: {
      enabled: normalizeBoolean(getPlain(map, "payment.alipayF2f.enabled"), defaultSettings.alipayF2f.enabled),
      displayName: getPlain(map, "payment.alipayF2f.displayName", defaultSettings.alipayF2f.displayName),
      gatewayUrl: getPlain(map, "payment.alipayF2f.gatewayUrl", defaultSettings.alipayF2f.gatewayUrl),
      appId: getPlain(map, "payment.alipayF2f.appId", defaultSettings.alipayF2f.appId),
      privateKeyConfigured: alipayPrivateKey.configured,
      alipayPublicKeyConfigured: alipayPublicKey.configured,
      privateKey: alipayPrivateKey.value,
      alipayPublicKey: alipayPublicKey.value,
    },
    wechatPay: {
      enabled: normalizeBoolean(getPlain(map, "payment.wechatPay.enabled"), defaultSettings.wechatPay.enabled),
      displayName: getPlain(map, "payment.wechatPay.displayName", defaultSettings.wechatPay.displayName),
      mchId: getPlain(map, "payment.wechatPay.mchId", defaultSettings.wechatPay.mchId),
      appId: getPlain(map, "payment.wechatPay.appId", defaultSettings.wechatPay.appId),
      serialNo: getPlain(map, "payment.wechatPay.serialNo", defaultSettings.wechatPay.serialNo),
      privateKeyConfigured: wechatPrivateKey.configured,
      apiV3KeyConfigured: wechatApiV3Key.configured,
      platformPublicKeyConfigured: wechatPlatformPublicKey.configured,
      privateKey: wechatPrivateKey.value,
      apiV3Key: wechatApiV3Key.value,
      platformPublicKey: wechatPlatformPublicKey.value,
    },
    paypal: {
      enabled: normalizeBoolean(getPlain(map, "payment.paypal.enabled"), defaultSettings.paypal.enabled),
      displayName: getPlain(map, "payment.paypal.displayName", defaultSettings.paypal.displayName),
      mode: normalizeMode(getPlain(map, "payment.paypal.mode", defaultSettings.paypal.mode)),
      clientId: getPlain(map, "payment.paypal.clientId", defaultSettings.paypal.clientId),
      secretConfigured: paypalSecret.configured,
      secret: paypalSecret.value,
    },
  };
}

async function upsertPlain(key: string, value: string) {
  await prisma.appSetting.upsert({
    where: {
      key,
    },
    update: {
      value,
      isEncrypted: false,
    },
    create: {
      key,
      value,
      isEncrypted: false,
    },
  });
}

async function upsertSecretIfPresent(key: string, value: unknown) {
  const clean = normalizeText(value, "", 12000);
  if (!clean) {
    return;
  }

  await prisma.appSetting.upsert({
    where: {
      key,
    },
    update: {
      value: encryptSecret(clean),
      isEncrypted: true,
    },
    create: {
      key,
      value: encryptSecret(clean),
      isEncrypted: true,
    },
  });
}

export async function getPaymentProviderSettings() {
  return readPaymentProviderSettings(false);
}

export async function getPaymentRuntimeSettings() {
  return readPaymentProviderSettings(true);
}

export async function savePaymentProviderSettings(input: Partial<PaymentProviderSettings>) {
  await Promise.all([
    upsertPlain("payment.epay.enabled", String(Boolean(input.epay?.enabled))),
    upsertPlain("payment.epay.displayName", normalizeText(input.epay?.displayName, defaultSettings.epay.displayName, 80)),
    upsertPlain("payment.epay.gatewayUrl", normalizeText(input.epay?.gatewayUrl, "", 300)),
    upsertPlain("payment.epay.pid", normalizeText(input.epay?.pid, "", 120)),
    upsertPlain("payment.epay.defaultType", normalizeText(input.epay?.defaultType, defaultSettings.epay.defaultType, 40)),
    upsertPlain("payment.alipayF2f.enabled", String(Boolean(input.alipayF2f?.enabled))),
    upsertPlain("payment.alipayF2f.displayName", normalizeText(input.alipayF2f?.displayName, defaultSettings.alipayF2f.displayName, 80)),
    upsertPlain("payment.alipayF2f.gatewayUrl", normalizeText(input.alipayF2f?.gatewayUrl, defaultSettings.alipayF2f.gatewayUrl, 300)),
    upsertPlain("payment.alipayF2f.appId", normalizeText(input.alipayF2f?.appId, "", 120)),
    upsertPlain("payment.wechatPay.enabled", String(Boolean(input.wechatPay?.enabled))),
    upsertPlain("payment.wechatPay.displayName", normalizeText(input.wechatPay?.displayName, defaultSettings.wechatPay.displayName, 80)),
    upsertPlain("payment.wechatPay.mchId", normalizeText(input.wechatPay?.mchId, "", 120)),
    upsertPlain("payment.wechatPay.appId", normalizeText(input.wechatPay?.appId, "", 120)),
    upsertPlain("payment.wechatPay.serialNo", normalizeText(input.wechatPay?.serialNo, "", 160)),
    upsertPlain("payment.paypal.enabled", String(Boolean(input.paypal?.enabled))),
    upsertPlain("payment.paypal.displayName", normalizeText(input.paypal?.displayName, defaultSettings.paypal.displayName, 80)),
    upsertPlain("payment.paypal.mode", normalizeMode(input.paypal?.mode)),
    upsertPlain("payment.paypal.clientId", normalizeText(input.paypal?.clientId, "", 200)),
  ]);

  await Promise.all([
    upsertSecretIfPresent("payment.epay.key", input.epay?.key),
    upsertSecretIfPresent("payment.alipayF2f.privateKey", input.alipayF2f?.privateKey),
    upsertSecretIfPresent("payment.alipayF2f.alipayPublicKey", input.alipayF2f?.alipayPublicKey),
    upsertSecretIfPresent("payment.wechatPay.privateKey", input.wechatPay?.privateKey),
    upsertSecretIfPresent("payment.wechatPay.apiV3Key", input.wechatPay?.apiV3Key),
    upsertSecretIfPresent("payment.wechatPay.platformPublicKey", input.wechatPay?.platformPublicKey),
    upsertSecretIfPresent("payment.paypal.secret", input.paypal?.secret),
  ]);

  return getPaymentProviderSettings();
}

export async function listEnabledPaymentChannels(): Promise<PaymentChannelView[]> {
  const settings = await getPaymentProviderSettings();
  return [
    {
      provider: "epay",
      label: providerLabel("epay", settings),
      enabled: settings.epay.enabled,
      configured: Boolean(settings.epay.gatewayUrl && settings.epay.pid && settings.epay.keyConfigured),
    },
    {
      provider: "alipay_f2f",
      label: providerLabel("alipay_f2f", settings),
      enabled: settings.alipayF2f.enabled,
      configured: Boolean(settings.alipayF2f.appId && settings.alipayF2f.privateKeyConfigured && settings.alipayF2f.alipayPublicKeyConfigured),
    },
    {
      provider: "wechat_pay",
      label: providerLabel("wechat_pay", settings),
      enabled: settings.wechatPay.enabled,
      configured: Boolean(
        settings.wechatPay.mchId &&
          settings.wechatPay.appId &&
          settings.wechatPay.serialNo &&
          settings.wechatPay.privateKeyConfigured &&
          settings.wechatPay.apiV3KeyConfigured &&
          settings.wechatPay.platformPublicKeyConfigured,
      ),
    },
    {
      provider: "paypal",
      label: providerLabel("paypal", settings),
      enabled: settings.paypal.enabled,
      configured: Boolean(settings.paypal.clientId && settings.paypal.secretConfigured),
      mode: settings.paypal.mode,
    },
  ];
}

function createNotifyUrl(origin: string, provider: PaymentProviderName) {
  return `${origin}/api/payments/notify/${provider}`;
}

function createReturnUrl(origin: string, provider: PaymentProviderName, orderNo: string) {
  return `${origin}/api/payments/return/${provider}?orderNo=${encodeURIComponent(orderNo)}`;
}

function createEpaySign(params: Record<string, string>, key: string) {
  const source = Object.keys(params)
    .filter((name) => name !== "sign" && name !== "sign_type" && params[name])
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join("&");
  return createHash("md5").update(`${source}${key}`).digest("hex");
}

function signAlipayParams(params: Record<string, string>, privateKey: string) {
  const source = Object.keys(params)
    .filter((name) => name !== "sign" && params[name])
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join("&");
  return createSign("RSA-SHA256").update(source, "utf8").sign(privateKey, "base64");
}

function verifyAlipayParams(params: Record<string, string>, publicKey: string) {
  const signValue = params.sign;
  if (!signValue) {
    return false;
  }
  const source = Object.keys(params)
    .filter((name) => name !== "sign" && name !== "sign_type" && params[name])
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join("&");
  return createVerify("RSA-SHA256").update(source, "utf8").verify(publicKey, signValue, "base64");
}

function createWechatSignature(method: string, urlPath: string, body: string, privateKey: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = createSign("RSA-SHA256").update(message, "utf8").sign(privateKey, "base64");
  return {
    timestamp,
    nonce,
    signature,
  };
}

function verifyWechatNotifySignature(request: Request, rawBody: string, publicKey: string) {
  const timestamp = request.headers.get("Wechatpay-Timestamp") || "";
  const nonce = request.headers.get("Wechatpay-Nonce") || "";
  const signature = request.headers.get("Wechatpay-Signature") || "";
  if (!timestamp || !nonce || !signature) {
    return false;
  }
  const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
  return createVerify("RSA-SHA256").update(message, "utf8").verify(publicKey, signature, "base64");
}

function decryptWechatResource(resource: any, apiV3Key: string) {
  const ciphertext = Buffer.from(resource.ciphertext, "base64");
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const data = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(apiV3Key, "utf8"), Buffer.from(resource.nonce, "utf8"));
  decipher.setAuthTag(authTag);
  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, "utf8"));
  }
  return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8"));
}

function paypalBaseUrl(mode: PaymentMode) {
  return mode === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken(settings: PaymentProviderSettings["paypal"]) {
  if (!settings.clientId || !settings.secret) {
    throw new Error("PayPal 未配置 Client ID 或 Secret。");
  }

  const response = await fetch(`${paypalBaseUrl(settings.mode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${settings.clientId}:${settings.secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const payload = (await response.json().catch(() => ({}))) as any;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "PayPal 获取访问令牌失败。");
  }
  return payload.access_token as string;
}

export async function createPaymentForOrder(input: CreatePaymentInput): Promise<PaymentCreationResult> {
  const settings = await getPaymentRuntimeSettings();
  if (input.provider === "epay") {
    const epay = settings.epay;
    if (!epay.gatewayUrl || !epay.pid || !epay.key) {
      throw new Error("易支付配置不完整。");
    }
    const params: Record<string, string> = {
      pid: epay.pid,
      type: epay.defaultType || "alipay",
      out_trade_no: input.order.orderNo,
      notify_url: createNotifyUrl(input.origin, "epay"),
      return_url: createReturnUrl(input.origin, "epay", input.order.orderNo),
      name: input.order.packageNameSnapshot,
      money: yuanString(input.order.amountCents),
      sitename: "Image2",
    };
    params.sign = createEpaySign(params, epay.key);
    params.sign_type = "MD5";
    const query = new URLSearchParams(params);
    const paymentUrl = `${epay.gatewayUrl.replace(/\/$/, "")}/submit.php?${query.toString()}`;
    return {
      paymentUrl,
      qrCodeUrl: paymentUrl,
      providerTradeNo: input.order.orderNo,
      providerPayload: {
        type: params.type,
      },
    };
  }

  if (input.provider === "alipay_f2f") {
    const alipay = settings.alipayF2f;
    if (!alipay.appId || !alipay.privateKey || !alipay.alipayPublicKey) {
      throw new Error("支付宝当面付配置不完整。");
    }
    const params: Record<string, string> = {
      app_id: alipay.appId,
      method: "alipay.trade.precreate",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      version: "1.0",
      notify_url: createNotifyUrl(input.origin, "alipay_f2f"),
      biz_content: JSON.stringify({
        out_trade_no: input.order.orderNo,
        total_amount: yuanString(input.order.amountCents),
        subject: input.order.packageNameSnapshot,
      }),
    };
    params.sign = signAlipayParams(params, alipay.privateKey);
    const response = await fetch(alipay.gatewayUrl || defaultSettings.alipayF2f.gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: new URLSearchParams(params).toString(),
    });
    const payload = (await response.json().catch(() => ({}))) as any;
    const result = payload.alipay_trade_precreate_response || {};
    if (!response.ok || result.code !== "10000" || !result.qr_code) {
      throw new Error(result.sub_msg || result.msg || "支付宝当面付创建订单失败。");
    }
    return {
      qrCodeUrl: result.qr_code,
      providerTradeNo: result.out_trade_no || input.order.orderNo,
      providerPayload: result,
    };
  }

  if (input.provider === "wechat_pay") {
    const wechat = settings.wechatPay;
    if (!wechat.mchId || !wechat.appId || !wechat.serialNo || !wechat.privateKey || !wechat.apiV3Key || !wechat.platformPublicKey) {
      throw new Error("微信支付配置不完整。");
    }
    const urlPath = "/v3/pay/transactions/native";
    const body = JSON.stringify({
      appid: wechat.appId,
      mchid: wechat.mchId,
      description: input.order.packageNameSnapshot,
      out_trade_no: input.order.orderNo,
      notify_url: createNotifyUrl(input.origin, "wechat_pay"),
      amount: {
        total: input.order.amountCents,
        currency: input.order.currency,
      },
    });
    const signature = createWechatSignature("POST", urlPath, body, wechat.privateKey);
    const response = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization:
          `WECHATPAY2-SHA256-RSA2048 mchid="${wechat.mchId}",nonce_str="${signature.nonce}",signature="${signature.signature}",timestamp="${signature.timestamp}",serial_no="${wechat.serialNo}"`,
      },
      body,
    });
    const payload = (await response.json().catch(() => ({}))) as any;
    if (!response.ok || !payload.code_url) {
      throw new Error(payload.message || "微信支付 Native 下单失败。");
    }
    return {
      qrCodeUrl: payload.code_url,
      providerTradeNo: input.order.orderNo,
      providerPayload: payload,
    };
  }

  const paypal = settings.paypal;
  if (!paypal.clientId || !paypal.secret) {
    throw new Error("PayPal 配置不完整。");
  }
  const accessToken = await getPayPalAccessToken(paypal);
  const response = await fetch(`${paypalBaseUrl(paypal.mode)}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.order.orderNo,
          custom_id: input.order.orderNo,
          amount: {
            currency_code: input.order.currency,
            value: yuanString(input.order.amountCents),
          },
          description: input.order.packageNameSnapshot,
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: createReturnUrl(input.origin, "paypal", input.order.orderNo),
            cancel_url: `${input.origin}/account`,
          },
        },
      },
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as any;
  const paymentUrl = payload.links?.find((link: any) => link.rel === "approve")?.href;
  if (!response.ok || !payload.id || !paymentUrl) {
    throw new Error(payload.message || "PayPal 创建订单失败。");
  }
  return {
    paymentUrl,
    providerTradeNo: payload.id,
    providerPayload: payload,
  };
}

export async function parsePaymentNotify(provider: PaymentProviderName, request: Request): Promise<PaymentNotifyResult> {
  const settings = await getPaymentRuntimeSettings();
  if (provider === "epay") {
    const url = new URL(request.url);
    const params = new URLSearchParams(url.search);
    if (request.method !== "GET") {
      const body = await request.text();
      new URLSearchParams(body).forEach((value, key) => params.set(key, value));
    }
    const values = Object.fromEntries(params.entries());
    const sign = createEpaySign(values, settings.epay.key || "");
    if (sign !== values.sign) {
      throw new Error("易支付回调签名错误。");
    }
    if (!["TRADE_SUCCESS", "1"].includes(values.trade_status || values.status || "")) {
      throw new Error("易支付订单未成功。");
    }
    return {
      ok: true,
      provider,
      orderNo: values.out_trade_no,
      providerTradeNo: values.trade_no || values.api_trade_no || values.out_trade_no,
      amountCents: centsFromYuan(values.money),
      currency: "CNY",
      rawPayload: values,
    };
  }

  if (provider === "alipay_f2f") {
    const body = await request.text();
    const values = Object.fromEntries(new URLSearchParams(body).entries());
    if (!verifyAlipayParams(values, settings.alipayF2f.alipayPublicKey || "")) {
      throw new Error("支付宝回调签名错误。");
    }
    if (values.trade_status !== "TRADE_SUCCESS" && values.trade_status !== "TRADE_FINISHED") {
      throw new Error("支付宝订单未成功。");
    }
    return {
      ok: true,
      provider,
      orderNo: values.out_trade_no,
      providerTradeNo: values.trade_no,
      amountCents: centsFromYuan(values.total_amount),
      currency: "CNY",
      rawPayload: values,
    };
  }

  if (provider === "wechat_pay") {
    const rawBody = await request.text();
    if (!verifyWechatNotifySignature(request, rawBody, settings.wechatPay.platformPublicKey || "")) {
      throw new Error("微信支付回调签名错误。");
    }
    const payload = JSON.parse(rawBody);
    const transaction = decryptWechatResource(payload.resource, settings.wechatPay.apiV3Key || "");
    if (transaction.trade_state !== "SUCCESS") {
      throw new Error("微信支付订单未成功。");
    }
    return {
      ok: true,
      provider,
      orderNo: transaction.out_trade_no,
      providerTradeNo: transaction.transaction_id,
      amountCents: Number(transaction.amount?.payer_total || transaction.amount?.total || 0),
      currency: transaction.amount?.currency || "CNY",
      rawPayload: transaction,
    };
  }

  throw new Error("PayPal Webhook 未启用，请使用 PayPal 返回页完成 Capture。");
}

export async function capturePayPalOrder(orderNo: string, paypalOrderId: string) {
  const settings = await getPaymentRuntimeSettings();
  const accessToken = await getPayPalAccessToken(settings.paypal);
  const response = await fetch(`${paypalBaseUrl(settings.paypal.mode)}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const payload = (await response.json().catch(() => ({}))) as any;
  if (!response.ok || payload.status !== "COMPLETED") {
    throw new Error(payload.message || "PayPal Capture 失败。");
  }

  const unit = payload.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  return {
    ok: true,
    provider: "paypal" as const,
    orderNo,
    providerTradeNo: payload.id,
    amountCents: centsFromYuan(capture?.amount?.value),
    currency: capture?.amount?.currency_code || unit?.amount?.currency_code || "USD",
    rawPayload: payload,
  };
}
