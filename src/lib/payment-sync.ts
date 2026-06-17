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
};

const QUERY_COOLDOWN_MS = 10 * 1000;
const MAX_QUERY_CACHE_ITEMS = 500;
const queryTimestamps = new Map<string, number>();
const inFlightQueries = new Map<string, Promise<void>>();

function queryableProvider(value: string): PaymentProviderName | null {
  return value === "alipay_f2f" ? "alipay_f2f" : null;
}

function shouldQuery(orderId: string, force: boolean) {
  const now = Date.now();
  if (queryTimestamps.size > MAX_QUERY_CACHE_ITEMS) {
    const cutoff = now - QUERY_COOLDOWN_MS * 6;
    for (const [key, value] of queryTimestamps.entries()) {
      if (value < cutoff) {
        queryTimestamps.delete(key);
      }
    }
  }

  const lastQueriedAt = queryTimestamps.get(orderId) || 0;
  if (!force && now - lastQueriedAt < QUERY_COOLDOWN_MS) {
    return false;
  }

  queryTimestamps.set(orderId, now);
  return true;
}

async function safeRecordPaymentEvent(input: PaymentEventInput) {
  try {
    await recordPaymentEvent(input);
  } catch {
    // Payment sync should not fail just because diagnostics cannot be written.
  }
}

async function syncRechargeOrder(order: RechargeOrderForSync, options: { force?: boolean } = {}) {
  const provider = queryableProvider(order.provider);
  if (!provider || order.status !== "PENDING") {
    return;
  }

  const inFlight = inFlightQueries.get(order.id);
  if (inFlight) {
    await inFlight;
    return;
  }

  if (!shouldQuery(order.id, Boolean(options.force))) {
    return;
  }

  const syncTask = (async () => {
    try {
      const result = await queryPaymentOrder(provider, order.orderNo);
      if (!result.paid) {
        await safeRecordPaymentEvent({
          provider,
          eventType: "query",
          status: "IGNORED",
          orderNo: order.orderNo,
          providerTradeNo: result.providerTradeNo,
          rawPayload: result.rawPayload,
          message: result.tradeStatus ? `主动查询未支付：${result.tradeStatus}` : "主动查询未支付",
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
        eventType: "query",
        status: "VERIFIED",
        orderNo: result.orderNo || order.orderNo,
        providerTradeNo: result.providerTradeNo,
        rawPayload: result.rawPayload,
        message: "主动查询确认已支付并完成入账",
      });
    } catch (error) {
      await safeRecordPaymentEvent({
        provider,
        eventType: "query",
        status: "FAILED",
        orderNo: order.orderNo,
        rawPayload: {
          orderNo: order.orderNo,
          provider,
        },
        message: error instanceof Error ? error.message : "主动查询支付状态失败",
      });
    }
  })().finally(() => {
    inFlightQueries.delete(order.id);
  });

  inFlightQueries.set(order.id, syncTask);
  await syncTask;
}

export async function syncRechargeOrderFromProviderForUser(userId: string, orderId: string, options: { force?: boolean } = {}) {
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
    },
  });

  if (!order) {
    return;
  }

  await syncRechargeOrder(order, options);
}

export async function syncPendingRechargeOrdersFromProviderForUser(userId: string, limit = 3) {
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
    },
    orderBy: {
      createdAt: "desc",
    },
    take: Math.min(Math.max(limit, 1), 5),
  });

  for (const order of orders) {
    await syncRechargeOrder(order);
  }
}
