import { prisma } from "./db";
import { AppError } from "./app-error";

export function estimateGenerationCreditCost(quality: string, imageCount: number) {
  const singleCost = quality === "high" ? 35 : quality === "low" ? 3 : 10;
  return singleCost * imageCount;
}

async function ensureCreditAccount(userId: string) {
  return prisma.creditAccount.upsert({
    where: {
      userId,
    },
    update: {},
    create: {
      userId,
      available: 0,
      frozen: 0,
    },
  });
}

export async function getUserCreditBalance(userId: string) {
  const account = await ensureCreditAccount(userId);
  return {
    available: account.available,
    frozen: account.frozen,
  };
}

export type CreditTransactionView = {
  id: string;
  type: string;
  amount: number;
  balance: number;
  memo: string | null;
  jobId: string | null;
  orderId: string | null;
  createdAt: string;
};

export async function listUserCreditTransactions(userId: string, limit = 50): Promise<CreditTransactionView[]> {
  const normalizedLimit = Math.min(Math.max(Math.floor(limit) || 50, 1), 200);
  const rows = await prisma.creditTransaction.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: normalizedLimit,
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    amount: row.amount,
    balance: row.balance,
    memo: row.memo,
    jobId: row.jobId,
    orderId: row.orderId,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function reserveCreditsForJob(userId: string, amount: number, jobId: string) {
  if (amount <= 0) {
    return;
  }

  await ensureCreditAccount(userId);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.creditAccount.updateMany({
      where: {
        userId,
        available: {
          gte: amount,
        },
      },
      data: {
        available: {
          decrement: amount,
        },
        frozen: {
          increment: amount,
        },
      },
    });

    if (updated.count === 0) {
      throw new AppError("INSUFFICIENT_CREDITS", `积分不足，本次生成需要 ${amount} 积分。`, 402);
    }

    const account = await tx.creditAccount.findUniqueOrThrow({
      where: {
        userId,
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "FREEZE",
        amount: -amount,
        balance: account.available,
        jobId,
        memo: "生图任务开始前冻结积分",
      },
    });
  });
}

export async function spendReservedCreditsForJob(userId: string, amount: number, jobId: string) {
  if (amount <= 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.creditAccount.update({
      where: {
        userId,
      },
      data: {
        frozen: {
          decrement: amount,
        },
      },
    });

    const account = await tx.creditAccount.findUniqueOrThrow({
      where: {
        userId,
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "SPEND",
        amount: -amount,
        balance: account.available,
        jobId,
        memo: "生图成功扣除积分",
      },
    });
  });
}

export async function refundReservedCreditsForJob(userId: string, amount: number, jobId: string) {
  if (amount <= 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.creditAccount.update({
      where: {
        userId,
      },
      data: {
        available: {
          increment: amount,
        },
        frozen: {
          decrement: amount,
        },
      },
    });

    const account = await tx.creditAccount.findUniqueOrThrow({
      where: {
        userId,
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "REFUND",
        amount,
        balance: account.available,
        jobId,
        memo: "生图失败返还冻结积分",
      },
    });
  });
}

export async function grantPurchasedCredits(userId: string, amount: number, orderId: string, memo = "积分充值到账") {
  if (amount <= 0) {
    return;
  }

  await ensureCreditAccount(userId);

  await prisma.$transaction(async (tx) => {
    await tx.creditAccount.update({
      where: {
        userId,
      },
      data: {
        available: {
          increment: amount,
        },
      },
    });

    const account = await tx.creditAccount.findUniqueOrThrow({
      where: {
        userId,
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "PURCHASE",
        amount,
        balance: account.available,
        orderId,
        memo,
      },
    });
  });
}
