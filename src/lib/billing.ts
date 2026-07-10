import { createHash, randomBytes } from "crypto";
import type { RechargeOrderStatus } from "@prisma/client";

import { AppError } from "@/lib/app-error";
import { prisma } from "@/lib/db";
import { getUserCreditBalance } from "@/lib/credits";
import { getMembershipRuntimeConfig } from "@/lib/settings";
import {
  createPaymentForOrder,
  getPaymentProviderSettings,
  listPublicPaymentChannels,
  type PaymentChannelView,
  type PaymentProviderName,
  type PaymentProviderSettings,
} from "@/lib/payments";

const defaultPackages = [
  {
    name: "入门包",
    description: "适合先体验图片生成和提示词润色。",
    credits: 100,
    bonusCredits: 0,
    priceCents: 1290,
    sortOrder: 10,
  },
  {
    name: "创作包",
    description: "日常创作推荐，额外赠送 60 积分。",
    credits: 500,
    bonusCredits: 60,
    priceCents: 4900,
    sortOrder: 20,
  },
  {
    name: "专业包",
    description: "适合高频生成，额外赠送 180 积分。",
    credits: 1200,
    bonusCredits: 180,
    priceCents: 10900,
    sortOrder: 30,
  },
];

export type BillingPaymentSettings = PaymentProviderSettings;

export type CreditPackageType = "RECHARGE" | "SUBSCRIPTION";

export type CreditPackageView = {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  priceCents: number;
  currency: string;
  packageType: CreditPackageType;
  durationDays: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionView = {
  packageName: string;
  startedAt: string;
  expiresAt: string;
  active: boolean;
  daysRemaining: number;
};

export type RechargeOrderView = {
  id: string;
  orderNo: string;
  userId: string;
  userEmail: string | null;
  packageId: string | null;
  packageNameSnapshot: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  packageType: CreditPackageType;
  durationDays: number;
  amountCents: number;
  currency: string;
  status: RechargeOrderStatus;
  provider: string;
  paymentUrl: string | null;
  qrCodeUrl: string | null;
  providerTradeNo: string | null;
  providerPayload: string | null;
  notifyPayloadDigest: string | null;
  notifiedAt: string | null;
  capturedAt: string | null;
  paymentMethod: string;
  paymentNote: string | null;
  paymentProofUrl: string | null;
  paymentProofName: string | null;
  paymentProofMimeType: string | null;
  paymentProofSize: number | null;
  submittedAt: string | null;
  adminNote: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingOverview = {
  balance: {
    available: number;
    frozen: number;
  };
  packages: CreditPackageView[];
  orders: RechargeOrderView[];
  channels: PaymentChannelView[];
  subscription: SubscriptionView | null;
  membershipBenefits: MembershipBenefitsView;
};

export type MembershipBenefitsView = {
  discountPercent: number;
  dailyCredits: number;
  generationRateLimit: number;
};

function normalizePackageType(value: unknown): CreditPackageType {
  return value === "SUBSCRIPTION" ? "SUBSCRIPTION" : "RECHARGE";
}

function serializeSubscription(sub: any): SubscriptionView | null {
  if (!sub) {
    return null;
  }
  const expiresAt: Date = sub.expiresAt;
  const remainingMs = expiresAt.getTime() - Date.now();
  return {
    packageName: sub.packageName,
    startedAt: sub.startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    active: remainingMs > 0,
    daysRemaining: remainingMs > 0 ? Math.ceil(remainingMs / (1000 * 60 * 60 * 24)) : 0,
  };
}

export async function getUserSubscription(userId: string): Promise<SubscriptionView | null> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  return serializeSubscription(sub);
}

function serializePackage(pkg: any): CreditPackageView {
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    credits: pkg.credits,
    bonusCredits: pkg.bonusCredits,
    totalCredits: pkg.credits + pkg.bonusCredits,
    priceCents: pkg.priceCents,
    currency: pkg.currency,
    packageType: normalizePackageType(pkg.packageType),
    durationDays: pkg.durationDays ?? 0,
    sortOrder: pkg.sortOrder,
    isActive: Boolean(pkg.isActive),
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
  };
}

function serializeOrder(order: any): RechargeOrderView {
  return {
    id: order.id,
    orderNo: order.orderNo,
    userId: order.userId,
    userEmail: order.user?.email || null,
    packageId: order.packageId,
    packageNameSnapshot: order.packageNameSnapshot,
    credits: order.credits,
    bonusCredits: order.bonusCredits,
    totalCredits: order.credits + order.bonusCredits,
    packageType: normalizePackageType(order.packageType),
    durationDays: order.durationDays ?? 0,
    amountCents: order.amountCents,
    currency: order.currency,
    status: order.status,
    provider: order.provider,
    paymentUrl: order.paymentUrl || null,
    qrCodeUrl: order.qrCodeUrl || null,
    providerTradeNo: order.providerTradeNo || null,
    providerPayload: order.providerPayload || null,
    notifyPayloadDigest: order.notifyPayloadDigest || null,
    notifiedAt: order.notifiedAt ? order.notifiedAt.toISOString() : null,
    capturedAt: order.capturedAt ? order.capturedAt.toISOString() : null,
    paymentMethod: order.paymentMethod || order.provider || "online",
    paymentNote: order.paymentNote || null,
    paymentProofUrl: order.paymentProofUrl || null,
    paymentProofName: order.paymentProofName || null,
    paymentProofMimeType: order.paymentProofMimeType || null,
    paymentProofSize: order.paymentProofSize || null,
    submittedAt: order.submittedAt ? order.submittedAt.toISOString() : null,
    adminNote: order.adminNote || null,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    expiresAt: order.expiresAt ? order.expiresAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

function normalizeLimit(value?: number) {
  if (!Number.isFinite(value)) {
    return 80;
  }

  return Math.min(Math.max(Math.floor(Number(value)), 1), 160);
}

function normalizeText(value: unknown, maxLength = 800) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function createOrderNo() {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `RC${ymd}${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function formatCurrency(priceCents: number, currency = "CNY") {
  const value = priceCents / 100;
  if (currency === "CNY") {
    return `¥${value.toFixed(2).replace(/\.00$/, "")}`;
  }

  return `${currency} ${value.toFixed(2)}`;
}

export async function getBillingPaymentSettings(): Promise<BillingPaymentSettings> {
  return getPaymentProviderSettings();
}

export { savePaymentProviderSettings as saveBillingPaymentSettings } from "@/lib/payments";

export async function ensureDefaultCreditPackages() {
  const count = await prisma.creditPackage.count();
  if (count > 0) {
    return;
  }

  await prisma.creditPackage.createMany({
    data: defaultPackages.map((pkg) => ({
      ...pkg,
      currency: "CNY",
      isActive: true,
    })),
  });
}

export async function listActiveCreditPackages() {
  await ensureDefaultCreditPackages();

  const packages = await prisma.creditPackage.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }],
  });

  return packages.map(serializePackage);
}

export async function listAdminCreditPackages() {
  await ensureDefaultCreditPackages();

  const packages = await prisma.creditPackage.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return packages.map(serializePackage);
}

export async function upsertCreditPackage(input: {
  id?: string;
  name: string;
  description?: string | null;
  credits: number;
  bonusCredits?: number;
  priceCents: number;
  currency?: string;
  packageType?: string;
  durationDays?: number;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const name = normalizeText(input.name, 80);
  const credits = Math.floor(Number(input.credits));
  const bonusCredits = Math.max(0, Math.floor(Number(input.bonusCredits || 0)));
  const priceCents = Math.floor(Number(input.priceCents));
  const packageType = normalizePackageType(input.packageType);
  const durationDays = Math.max(0, Math.floor(Number(input.durationDays || 0)));

  if (!name) {
    throw new AppError("BAD_REQUEST", "请输入套餐名称。", 400);
  }

  if (!Number.isFinite(credits) || credits <= 0) {
    throw new AppError("BAD_REQUEST", "套餐积分必须大于 0。", 400);
  }

  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    throw new AppError("BAD_REQUEST", "套餐价格必须大于 0。", 400);
  }

  if (packageType === "SUBSCRIPTION" && durationDays <= 0) {
    throw new AppError("BAD_REQUEST", "会员套餐的有效天数必须大于 0。", 400);
  }

  const data = {
    name,
    description: normalizeText(input.description, 300) || null,
    credits,
    bonusCredits,
    priceCents,
    currency: normalizeText(input.currency, 12) || "CNY",
    packageType,
    durationDays: packageType === "SUBSCRIPTION" ? durationDays : 0,
    sortOrder: Math.floor(Number(input.sortOrder || 0)),
    isActive: input.isActive ?? true,
  };

  const pkg = input.id
    ? await prisma.creditPackage.update({
        where: {
          id: input.id,
        },
        data,
      })
    : await prisma.creditPackage.create({
        data,
      });

  return serializePackage(pkg);
}

export async function createRechargeOrder(userId: string, packageId: string, provider: PaymentProviderName, origin: string) {
  await ensureDefaultCreditPackages();

  const channels = await listPublicPaymentChannels();
  if (!channels.some((channel) => channel.provider === provider)) {
    throw new AppError("BAD_REQUEST", "该支付渠道未启用或尚未配置完整。", 400);
  }

  const pkg = await prisma.creditPackage.findFirst({
    where: {
      id: packageId,
      isActive: true,
    },
  });

  if (!pkg) {
    throw new AppError("NOT_FOUND", "套餐不存在或已下架。", 404);
  }

  const order = await prisma.rechargeOrder.create({
    data: {
      orderNo: createOrderNo(),
      userId,
      packageId: pkg.id,
      packageNameSnapshot: pkg.name,
      credits: pkg.credits,
      bonusCredits: pkg.bonusCredits,
      packageType: pkg.packageType,
      durationDays: pkg.durationDays,
      amountCents: pkg.priceCents,
      currency: pkg.currency,
      status: "PENDING",
      provider,
      paymentMethod: provider,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30),
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  const payment = await createPaymentForOrder({
    provider,
    order: {
      id: order.id,
      orderNo: order.orderNo,
      packageNameSnapshot: order.packageNameSnapshot,
      amountCents: order.amountCents,
      currency: order.currency,
    },
    origin,
  });

  const updated = await prisma.rechargeOrder.update({
    where: {
      id: order.id,
    },
    data: {
      paymentUrl: payment.paymentUrl || null,
      qrCodeUrl: payment.qrCodeUrl || null,
      providerTradeNo: payment.providerTradeNo || null,
      providerPayload: payment.providerPayload ? JSON.stringify(payment.providerPayload).slice(0, 6000) : null,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  return serializeOrder(updated);
}

type ListUserRechargeOrdersOptions = {
  includeOrderIds?: string[];
};

function normalizeOrderIds(values?: string[]) {
  return Array.from(new Set((values || []).map((value) => normalizeText(value, 80)).filter(Boolean))).slice(0, 20);
}

function mergeRechargeOrders(primaryOrders: any[], includedOrders: any[]) {
  const map = new Map<string, any>();
  for (const order of [...primaryOrders, ...includedOrders]) {
    map.set(order.id, order);
  }
  return Array.from(map.values()).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

export async function listUserRechargeOrders(userId: string, limit = 20, options: ListUserRechargeOrdersOptions = {}) {
  const includeOrderIds = normalizeOrderIds(options.includeOrderIds);
  const orders = await prisma.rechargeOrder.findMany({
    where: {
      userId,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: normalizeLimit(limit),
  });

  if (includeOrderIds.length === 0) {
    return orders.map(serializeOrder);
  }

  const includedOrders = await prisma.rechargeOrder.findMany({
    where: {
      userId,
      id: {
        in: includeOrderIds,
      },
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  return mergeRechargeOrders(orders, includedOrders).map(serializeOrder);
}

export async function getUserBillingOverview(userId: string, options: ListUserRechargeOrdersOptions = {}): Promise<BillingOverview> {
  const [balance, packages, orders, channels, subscription, membershipConfig] = await Promise.all([
    getUserCreditBalance(userId),
    listActiveCreditPackages(),
    listUserRechargeOrders(userId, 20, options),
    listPublicPaymentChannels(),
    getUserSubscription(userId),
    getMembershipRuntimeConfig(),
  ]);

  return {
    balance,
    packages,
    orders,
    channels,
    subscription,
    membershipBenefits: {
      discountPercent: membershipConfig.discountPercent,
      dailyCredits: membershipConfig.dailyCredits,
      generationRateLimit: membershipConfig.generationRateLimit,
    },
  };
}

export async function listAdminRechargeOrders({
  status,
  q,
  limit,
}: {
  status?: string | null;
  q?: string | null;
  limit?: number;
} = {}) {
  const cleanStatus = ["PENDING", "PAID", "CANCELED", "EXPIRED"].includes(status || "") ? (status as RechargeOrderStatus) : undefined;
  const cleanQuery = normalizeText(q, 120);

  const orders = await prisma.rechargeOrder.findMany({
    where: {
      ...(cleanStatus ? { status: cleanStatus } : {}),
      ...(cleanQuery
        ? {
            OR: [
              {
                orderNo: {
                  contains: cleanQuery,
                  mode: "insensitive",
                },
              },
              {
                packageNameSnapshot: {
                  contains: cleanQuery,
                  mode: "insensitive",
                },
              },
              {
                provider: {
                  contains: cleanQuery,
                  mode: "insensitive",
                },
              },
              {
                providerTradeNo: {
                  contains: cleanQuery,
                  mode: "insensitive",
                },
              },
              {
                user: {
                  is: {
                    email: {
                      contains: cleanQuery,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: normalizeLimit(limit),
  });

  return orders.map(serializeOrder);
}

export async function markRechargeOrderPaidByPayment(input: {
  orderNo: string;
  provider: PaymentProviderName;
  providerTradeNo?: string | null;
  amountCents: number;
  currency?: string | null;
  rawPayload?: unknown;
  captured?: boolean;
}) {
  const order = await prisma.rechargeOrder.findFirst({
    where: {
      OR: [
        {
          orderNo: input.orderNo,
          provider: input.provider,
        },
        input.providerTradeNo
          ? {
              provider: input.provider,
              providerTradeNo: input.providerTradeNo,
            }
          : undefined,
      ].filter(Boolean) as any,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError("NOT_FOUND", "订单不存在。", 404);
  }

  if (order.status === "PAID") {
    return serializeOrder(order);
  }

  if (order.status === "CANCELED") {
    // 用户已主动取消却又收到成功支付：不自动入账（避免与退款流程冲突），
    // 抛错让调用方（notify / payment-sync）落一条支付诊断事件，由管理员人工核对退款或补发。
    throw new AppError(
      "CONFLICT",
      `订单 ${order.orderNo} 已被用户取消，但收到成功支付，请在支付事件中人工核对并退款或补发积分。`,
      409,
    );
  }

  // 允许 PENDING 或 EXPIRED（超时过期）入账——迟到支付不能"钱付了积分不发"。
  if (order.status !== "PENDING" && order.status !== "EXPIRED") {
    throw new AppError("CONFLICT", "订单不是待支付状态。", 409);
  }

  if (order.amountCents !== input.amountCents) {
    throw new AppError("BAD_REQUEST", "支付金额与订单金额不一致。", 400);
  }

  if (input.currency && order.currency !== input.currency) {
    throw new AppError("BAD_REQUEST", "支付币种与订单币种不一致。", 400);
  }

  const totalCredits = order.credits + order.bonusCredits;
  const digest = createHash("sha256").update(JSON.stringify(input.rawPayload || {})).digest("hex");
  const paidOrder = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.rechargeOrder.updateMany({
      where: {
        id: order.id,
        status: {
          in: ["PENDING", "EXPIRED"],
        },
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
        capturedAt: input.captured ? new Date() : order.capturedAt,
        notifiedAt: new Date(),
        providerTradeNo: input.providerTradeNo || order.providerTradeNo,
        notifyPayloadDigest: digest,
      },
    });

    if (updatedOrder.count === 0) {
      const current = await tx.rechargeOrder.findUniqueOrThrow({
        where: {
          id: order.id,
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });
      return current;
    }

    await tx.creditAccount.upsert({
      where: {
        userId: order.userId,
      },
      update: {
        available: {
          increment: totalCredits,
        },
      },
      create: {
        userId: order.userId,
        available: totalCredits,
        frozen: 0,
      },
    });

    const account = await tx.creditAccount.findUniqueOrThrow({
      where: {
        userId: order.userId,
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId: order.userId,
        type: "PURCHASE",
        amount: totalCredits,
        balance: account.available,
        orderId: order.id,
        memo: `在线支付订单 ${order.orderNo} 到账`,
      },
    });

    // 会员套餐：在充值到账的同时续期会员有效期（从当前有效期与现在的较晚者往后顺延）。
    if (order.packageType === "SUBSCRIPTION" && order.durationDays > 0) {
      const existing = await tx.subscription.findUnique({ where: { userId: order.userId } });
      const base = existing && existing.expiresAt.getTime() > Date.now() ? existing.expiresAt.getTime() : Date.now();
      const expiresAt = new Date(base + order.durationDays * 24 * 60 * 60 * 1000);
      await tx.subscription.upsert({
        where: { userId: order.userId },
        update: {
          packageId: order.packageId,
          packageName: order.packageNameSnapshot,
          expiresAt,
          lastOrderId: order.id,
        },
        create: {
          userId: order.userId,
          packageId: order.packageId,
          packageName: order.packageNameSnapshot,
          expiresAt,
          lastOrderId: order.id,
        },
      });
    }

    return tx.rechargeOrder.findUniqueOrThrow({
      where: {
        id: order.id,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });
  });

  return serializeOrder(paidOrder);
}

export async function cancelRechargeOrderForUser(userId: string, orderId: string) {
  // 原子取消：只翻转仍为 PENDING 的订单，避免与支付回调竞态时把刚 PAID 的订单误改为 CANCELED。
  const result = await prisma.rechargeOrder.updateMany({
    where: {
      id: orderId,
      userId,
      status: "PENDING",
    },
    data: {
      status: "CANCELED",
    },
  });

  const order = await prisma.rechargeOrder.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError("NOT_FOUND", "订单不存在。", 404);
  }

  if (result.count === 0) {
    if (order.status === "CANCELED") {
      return serializeOrder(order); // 幂等：已取消
    }
    if (order.status === "PAID") {
      throw new AppError("CONFLICT", "订单已支付成功，积分已到账，无法取消。", 409);
    }
    throw new AppError("CONFLICT", "只有待支付订单可以取消。", 409);
  }

  return serializeOrder(order);
}
