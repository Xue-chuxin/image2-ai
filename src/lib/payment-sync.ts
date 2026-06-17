import { markRechargeOrderPaidByPayment } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { recordPaymentEvent } from "@/lib/payment-diagnostics";
import { queryPaymentOrder } from "@/lib/payments";
import type { PaymentEventInput } from "@/lib/payment-diagnostics";
import type { PaymentProviderName } from "@/lib/payments";

type RechargeOrderForSync = {
  id: string;
  userId: string;
  orderNo: string;
  provider: string;
  status: string;
  amountCents: number;
  currency: string;
  createdAt: Date;
};

type PaymentSyncMode = "auto" | "manual";

type PaymentSyncOptions = {
  force?: boolean;
  mode?: PaymentSyncMode;
};

const FAST_QUERY_WINDOW_MS = 2 * 60 * 1000;
const FAST_QUERY_COOLDOWN_MS = 3 * 1000;
const NORMAL_QUERY_COOLDOWN_MS = 10 * 1000;
const MAX_QUERY_CACHE_ITEMS = 500;
const queryTimestamps = new Map<string, number>();
const inFlightQueries = new Map<string, Promise<void>>();

function queryableProvider(value: string): PaymentProviderName | null {
  return value === "alipay_f2f" ? "alipay_f2f" : null;
}

function paymentQueryEventType(mode: PaymentSyncMode) {
  return mode === "manual" ? "query_manual" : "query_auto";
}

function paymentQueryMessage(mode: PaymentSyncMode, message: string) {
  return mode === "manual" ? `手动查单${message}` : `自动查单${message}`;
}

function getQueryCooldownMs(order: RechargeOrderForSync) {
  return Date.now() - order.createdAt.getTime() <= FAST_QUERY_WINDOW_MS ? FAST_QUERY_COOLDOWN_MS : NORMAL_QUERY_COOLDOWN_MS;
}

function shouldQuery(order: RechargeOrderForSync, force: boolean) {
  const now = Date.now();
  if (queryTimestamps.size > MAX_QUERY_CACHE_ITEMS) {
    const cutoff = now - NORMAL_QUERY_COOLDOWN_MS * 6;
    for (const [key, value] of queryTimestamps.entries()) {
      if (value < cutoff) {
        queryTimestamps.delete(key);
      }
    }
  }

  const cooldownMs = getQueryCooldownMs(order);
  const lastQueriedAt = queryTimestamps.get(order.id) || 0;
  if (!force && now - lastQueriedAt < cooldownMs) {
    return false;
  }

  queryTimestamps.set(order.id, now);
  return true;
}

async function safeRecordPaymentEvent(input: PaymentEventInput) {
  try {
    await recordPaymentEvent(input);
  } catch {
    // Payment sync should not fail just because diagnostics cannot be written.
  }
}

async function syncRechargeOrder(order: RechargeOrderForSync, options: PaymentSyncOptions = {}) {
  const provider = queryableProvider(order.provider);
  if (!provider || order.status !== "PENDING") {
    return;
  }
  const mode = options.mode || "auto";
  const eventType = paymentQueryEventType(mode);

  const inFlight = inFlightQueries.get(order.id);
  if (inFlight) {
    await inFlight;
    return;
  }

  if (!shouldQuery(order, Boolean(options.force))) {
    return;
  }

  const syncTask = (async () => {
    try {
      const result = await queryPaymentOrder(provider, order.orderNo);
      if (!result.paid) {
        await safeRecordPaymentEvent({
          provider,
          eventType,
          status: "IGNORED",
          orderNo: order.orderNo,
          providerTradeNo: result.providerTradeNo,
          rawPayload: result.rawPayload,
          message: result.tradeStatus ? paymentQueryMessage(mode, `未支付：${result.tradeStatus}`) : paymentQueryMessage(mode, "未支付"),
        });
        return;
      }

      await markRechargeOrderPaidByPayment({
        orderNo: result.orderNo || order.orderNo,
        provider,
        providerTradeNo: result.providerTradeNo,
        amountCents: result.amountCents ?? order.amountCents,
        currency: result.currency || order.currency,
        rawPayload: result.rawPayload,
        captured: true,
      });

      await safeRecordPaymentEvent({
        provider,
        eventType,
        status: "VERIFIED",
        orderNo: result.orderNo || order.orderNo,
        providerTradeNo: result.providerTradeNo,
        rawPayload: result.rawPayload,
        message: paymentQueryMessage(mode, "确认已支付并完成入账"),
      });
    } catch (error) {
      await safeRecordPaymentEvent({
        provider,
        eventType,
        status: "FAILED",
        orderNo: order.orderNo,
        rawPayload: {
          orderNo: order.orderNo,
          provider,
        },
        message: paymentQueryMessage(mode, error instanceof Error ? `失败：${error.message}` : "失败"),
      });
    }
  })().finally(() => {
    inFlightQueries.delete(order.id);
  });

  inFlightQueries.set(order.id, syncTask);
  await syncTask;
}

export async function syncRechargeOrderFromProviderForUser(userId: string, orderId: string, options: PaymentSyncOptions = {}) {
  const order = await prisma.rechargeOrder.findFirst({
    where: {
      id: orderId,
      userId,
    },
    select: {
      id: true,
      userId: true,
      orderNo: true,
      provider: true,
      status: true,
      amountCents: true,
      currency: true,
      createdAt: true,
    },
  });

  if (!order) {
    return;
  }

  await syncRechargeOrder(order, options);
}

export async function syncRechargeOrdersFromProviderForUser(userId: string, orderIds: string[], options: PaymentSyncOptions = {}) {
  const uniqueOrderIds = Array.from(new Set(orderIds.map((orderId) => orderId.trim()).filter(Boolean))).slice(0, 20);
  if (uniqueOrderIds.length === 0) {
    return;
  }

  const orders = await prisma.rechargeOrder.findMany({
    where: {
      id: {
        in: uniqueOrderIds,
      },
      userId,
      status: "PENDING",
      provider: "alipay_f2f",
    },
    select: {
      id: true,
      userId: true,
      orderNo: true,
      provider: true,
      status: true,
      amountCents: true,
      currency: true,
      createdAt: true,
    },
  });

  for (const order of orders) {
    await syncRechargeOrder(order, options);
  }
}

export async function syncPendingRechargeOrdersFromProviderForUser(userId: string, options: PaymentSyncOptions & { limit?: number } = {}) {
  const limit = options.limit || 3;
  const orders = await prisma.rechargeOrder.findMany({
    where: {
      userId,
      status: "PENDING",
      provider: "alipay_f2f",
    },
    select: {
      id: true,
      userId: true,
      orderNo: true,
      provider: true,
      status: true,
      amountCents: true,
      currency: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: Math.min(Math.max(limit, 1), 5),
  });

  for (const order of orders) {
    await syncRechargeOrder(order, options);
  }
}
