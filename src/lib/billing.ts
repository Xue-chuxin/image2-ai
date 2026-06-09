import { createHash, randomBytes } from "crypto";
import type { RechargeOrderStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getUserCreditBalance } from "@/lib/credits";
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
    priceCents: 990,
    sortOrder: 10,
  },
  {
    name: "创作包",
    description: "日常创作推荐，额外赠送 80 积分。",
    credits: 500,
    bonusCredits: 80,
    priceCents: 3900,
    sortOrder: 20,
  },
  {
    name: "专业包",
    description: "适合高频生成，额外赠送 260 积分。",
    credits: 1200,
    bonusCredits: 260,
    priceCents: 8900,
    sortOrder: 30,
  },
];

export type BillingPaymentSettings = PaymentProviderSettings;

export type CreditPackageView = {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  priceCents: number;
  currency: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
};

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
  sortOrder?: number;
  isActive?: boolean;
}) {
  const name = normalizeText(input.name, 80);
  const credits = Math.floor(Number(input.credits));
  const bonusCredits = Math.max(0, Math.floor(Number(input.bonusCredits || 0)));
  const priceCents = Math.floor(Number(input.priceCents));

  if (!name) {
    throw new Error("请输入套餐名称。");
  }

  if (!Number.isFinite(credits) || credits <= 0) {
    throw new Error("套餐积分必须大于 0。");
  }

  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    throw new Error("套餐价格必须大于 0。");
  }

  const data = {
    name,
    description: normalizeText(input.description, 300) || null,
    credits,
    bonusCredits,
    priceCents,
    currency: normalizeText(input.currency, 12) || "CNY",
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

  if (provider !== "epay") {
    throw new Error("首版充值暂只开放易支付渠道。");
  }

  const channels = await listPublicPaymentChannels();
  if (!channels.some((channel) => channel.provider === provider && channel.enabled && channel.configured)) {
    throw new Error("该支付渠道未启用或尚未配置完整。");
  }

  const pkg = await prisma.creditPackage.findFirst({
    where: {
      id: packageId,
      isActive: true,
    },
  });

  if (!pkg) {
    throw new Error("套餐不存在或已下架。");
  }

  const order = await prisma.rechargeOrder.create({
    data: {
      orderNo: createOrderNo(),
      userId,
      packageId: pkg.id,
      packageNameSnapshot: pkg.name,
      credits: pkg.credits,
      bonusCredits: pkg.bonusCredits,
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

export async function listUserRechargeOrders(userId: string, limit = 20) {
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

  return orders.map(serializeOrder);
}

export async function getUserBillingOverview(userId: string): Promise<BillingOverview> {
  const [balance, packages, orders, channels] = await Promise.all([
    getUserCreditBalance(userId),
    listActiveCreditPackages(),
    listUserRechargeOrders(userId, 20),
    listPublicPaymentChannels(),
  ]);

  return {
    balance,
    packages,
    orders,
    channels,
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
    throw new Error("订单不存在。");
  }

  if (order.status === "PAID") {
    return serializeOrder(order);
  }

  if (order.status !== "PENDING") {
    throw new Error("订单不是待支付状态。");
  }

  if (order.amountCents !== input.amountCents) {
    throw new Error("支付金额与订单金额不一致。");
  }

  if (input.currency && order.currency !== input.currency) {
    throw new Error("支付币种与订单币种不一致。");
  }

  const totalCredits = order.credits + order.bonusCredits;
  const digest = createHash("sha256").update(JSON.stringify(input.rawPayload || {})).digest("hex");
  const paidOrder = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.rechargeOrder.updateMany({
      where: {
        id: order.id,
        status: "PENDING",
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
    throw new Error("订单不存在。");
  }

  if (order.status !== "PENDING") {
    throw new Error("只有待支付订单可以取消。");
  }

  const updated = await prisma.rechargeOrder.update({
    where: {
      id: orderId,
    },
    data: {
      status: "CANCELED",
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
