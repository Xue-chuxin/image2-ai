import { prisma } from "./db";

export function estimateGenerationCreditCost(quality: string, imageCount: number) {
  const singleCost = quality === "high" ? 12 : quality === "low" ? 3 : 5;
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
      throw new Error(`积分不足，本次生成需要 ${amount} 积分。`);
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
