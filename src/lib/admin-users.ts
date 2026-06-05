import { prisma } from "@/lib/db";

export type AdminUserView = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
  availableCredits: number;
  frozenCredits: number;
  generationJobCount: number;
  rechargeOrderCount: number;
  paidRechargeOrderCount: number;
  uploadedImageCount: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function serializeDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeLimit(value?: number) {
  if (!Number.isFinite(value)) {
    return 80;
  }
  return Math.min(Math.max(Math.floor(Number(value)), 1), 160);
}

function normalizeQuery(value?: string | null) {
  return value?.trim() || "";
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

async function serializeUser(user: any): Promise<AdminUserView> {
  const [generationJobCount, rechargeOrderCount, paidRechargeOrderCount, uploadedImageCount] = await Promise.all([
    prisma.generationJob.count({
      where: {
        userId: user.id,
      },
    }),
    prisma.rechargeOrder.count({
      where: {
        userId: user.id,
      },
    }),
    prisma.rechargeOrder.count({
      where: {
        userId: user.id,
        status: "PAID",
      },
    }),
    prisma.uploadedImage.count({
      where: {
        userId: user.id,
      },
    }),
  ]);

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    availableCredits: user.creditAccount?.available || 0,
    frozenCredits: user.creditAccount?.frozen || 0,
    generationJobCount,
    rechargeOrderCount,
    paidRechargeOrderCount,
    uploadedImageCount,
    lastLoginAt: serializeDate(user.lastLoginAt),
    createdAt: serializeDate(user.createdAt) || new Date().toISOString(),
    updatedAt: serializeDate(user.updatedAt) || new Date().toISOString(),
  };
}

export async function listAdminUsers({
  q,
  limit,
}: {
  q?: string | null;
  limit?: number;
} = {}): Promise<AdminUserView[]> {
  const cleanQuery = normalizeQuery(q);
  const cleanLimit = normalizeLimit(limit);

  const users = await prisma.user.findMany({
    where: cleanQuery
      ? {
          OR: [
            {
              id: {
                contains: cleanQuery,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: cleanQuery,
                mode: "insensitive",
              },
            },
            {
              displayName: {
                contains: cleanQuery,
                mode: "insensitive",
              },
            },
          ],
        }
      : undefined,
    include: {
      creditAccount: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: cleanLimit,
  });

  return Promise.all(users.map(serializeUser));
}

export async function getAdminUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      creditAccount: true,
    },
  });

  return user ? serializeUser(user) : null;
}

export async function adjustUserCreditsByAdmin({
  userId,
  amount,
  reason,
  adminEmail,
}: {
  userId: string;
  amount: number;
  reason?: string | null;
  adminEmail: string;
}) {
  const normalizedAmount = Math.trunc(Number(amount));
  if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
    throw new Error("请输入非 0 的整数积分。");
  }

  if (Math.abs(normalizedAmount) > 100000) {
    throw new Error("单次调整积分不能超过 100000。");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      creditAccount: true,
    },
  });

  if (!user) {
    throw new Error("用户不存在。");
  }

  if (user.role !== "USER") {
    throw new Error("只能调整普通用户积分。");
  }

  const cleanReason = reason?.trim().slice(0, 120) || "运营后台手动调整";
  await ensureCreditAccount(userId);

  await prisma.$transaction(async (tx) => {
    if (normalizedAmount > 0) {
      await tx.creditAccount.update({
        where: {
          userId,
        },
        data: {
          available: {
            increment: normalizedAmount,
          },
        },
      });
    } else {
      const deduction = Math.abs(normalizedAmount);
      const updated = await tx.creditAccount.updateMany({
        where: {
          userId,
          available: {
            gte: deduction,
          },
        },
        data: {
          available: {
            decrement: deduction,
          },
        },
      });

      if (updated.count === 0) {
        throw new Error("用户可用积分不足，不能扣成负数。");
      }
    }

    const account = await tx.creditAccount.findUniqueOrThrow({
      where: {
        userId,
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: normalizedAmount > 0 ? "GRANT" : "SPEND",
        amount: normalizedAmount,
        balance: account.available,
        memo: `管理员调整：${cleanReason}（${adminEmail}）`,
      },
    });
  });

  return getAdminUser(userId);
}
