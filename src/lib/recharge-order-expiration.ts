import { prisma } from "@/lib/db";

export async function expirePendingRechargeOrders(userId?: string) {
  const now = new Date();

  return prisma.rechargeOrder.updateMany({
    where: {
      status: "PENDING",
      expiresAt: {
        lt: now,
      },
      userId: userId || undefined,
    },
    data: {
      status: "EXPIRED",
    },
  });
}

export async function expireRechargeOrderForUser(userId: string, orderId: string) {
  const now = new Date();

  return prisma.rechargeOrder.updateMany({
    where: {
      id: orderId,
      userId,
      status: "PENDING",
      expiresAt: {
        lt: now,
      },
    },
    data: {
      status: "EXPIRED",
    },
  });
}
