import { prisma } from "@/lib/db";
import { AppError } from "@/lib/app-error";
import { hashPassword } from "@/lib/auth";

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

function normalizeEditableEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!email) {
    throw new AppError("BAD_REQUEST", "请填写用户邮箱。", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("BAD_REQUEST", "邮箱格式不正确。", 400);
  }
  return email.slice(0, 254);
}

function normalizeDisplayName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim().slice(0, 80) || null;
}

function normalizeRole(value: unknown) {
  return value === "ADMIN" ? "ADMIN" : "USER";
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

type UserStats = {
  generationJobCount: number;
  rechargeOrderCount: number;
  paidRechargeOrderCount: number;
  uploadedImageCount: number;
};

const emptyUserStats: UserStats = {
  generationJobCount: 0,
  rechargeOrderCount: 0,
  paidRechargeOrderCount: 0,
  uploadedImageCount: 0,
};

// 批量聚合各用户的任务/订单/上传计数，避免每个用户单独发 4 条 count（N+1）。
async function loadUserStats(userIds: string[]): Promise<Map<string, UserStats>> {
  const stats = new Map<string, UserStats>(userIds.map((id) => [id, { ...emptyUserStats }]));
  if (!userIds.length) {
    return stats;
  }

  const [jobs, orders, paidOrders, uploads] = await Promise.all([
    prisma.generationJob.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _count: { _all: true } }),
    prisma.rechargeOrder.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _count: { _all: true } }),
    prisma.rechargeOrder.groupBy({ by: ["userId"], where: { userId: { in: userIds }, status: "PAID" }, _count: { _all: true } }),
    prisma.uploadedImage.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _count: { _all: true } }),
  ]);

  for (const row of jobs) {
    const entry = stats.get(row.userId);
    if (entry) entry.generationJobCount = row._count._all;
  }
  for (const row of orders) {
    const entry = stats.get(row.userId);
    if (entry) entry.rechargeOrderCount = row._count._all;
  }
  for (const row of paidOrders) {
    const entry = stats.get(row.userId);
    if (entry) entry.paidRechargeOrderCount = row._count._all;
  }
  for (const row of uploads) {
    const entry = stats.get(row.userId);
    if (entry) entry.uploadedImageCount = row._count._all;
  }

  return stats;
}

function serializeUser(user: any, stats: UserStats = emptyUserStats): AdminUserView {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    availableCredits: user.creditAccount?.available || 0,
    frozenCredits: user.creditAccount?.frozen || 0,
    generationJobCount: stats.generationJobCount,
    rechargeOrderCount: stats.rechargeOrderCount,
    paidRechargeOrderCount: stats.paidRechargeOrderCount,
    uploadedImageCount: stats.uploadedImageCount,
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

  const stats = await loadUserStats(users.map((user) => user.id));
  return users.map((user) => serializeUser(user, stats.get(user.id)));
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

  if (!user) {
    return null;
  }

  const stats = await loadUserStats([userId]);
  return serializeUser(user, stats.get(userId));
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

export async function updateUserByAdmin({
  userId,
  email,
  displayName,
  role,
  password,
  adminUserId,
}: {
  userId: string;
  email: unknown;
  displayName: unknown;
  role: unknown;
  password?: unknown;
  adminUserId: string;
}) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError("NOT_FOUND", "用户不存在。", 404);
  }

  const nextEmail = normalizeEditableEmail(email);
  const existingEmailUser = await prisma.user.findUnique({
    where: {
      email: nextEmail,
    },
  });

  if (existingEmailUser && existingEmailUser.id !== userId) {
    throw new AppError("CONFLICT", "这个邮箱已经被其他账号使用。", 409);
  }

  const nextRole = normalizeRole(role);
  if (user.id === adminUserId && nextRole !== "ADMIN") {
    throw new AppError("BAD_REQUEST", "不能把当前登录管理员降级。", 400);
  }

  if (user.role === "ADMIN" && nextRole !== "ADMIN") {
    const adminCount = await prisma.user.count({
      where: {
        role: "ADMIN",
      },
    });
    if (adminCount <= 1) {
      throw new AppError("BAD_REQUEST", "不能降级最后一个管理员。", 400);
    }
  }

  const nextPassword = typeof password === "string" ? password.trim() : "";
  if (nextPassword && nextPassword.length < 6) {
    throw new AppError("BAD_REQUEST", "密码至少需要 6 位。", 400);
  }

  const updated = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      email: nextEmail,
      displayName: normalizeDisplayName(displayName),
      role: nextRole,
      passwordHash: nextPassword ? hashPassword(nextPassword) : undefined,
      creditAccount:
        nextRole === "USER"
          ? {
              upsert: {
                update: {},
                create: {
                  available: 0,
                  frozen: 0,
                },
              },
            }
          : undefined,
    },
    include: {
      creditAccount: true,
    },
  });

  const stats = await loadUserStats([userId]);
  return serializeUser(updated, stats.get(userId));
}

export async function deleteUserByAdmin({
  userId,
  adminUserId,
}: {
  userId: string;
  adminUserId: string;
}) {
  if (userId === adminUserId) {
    throw new AppError("BAD_REQUEST", "不能删除当前登录管理员。", 400);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError("NOT_FOUND", "用户不存在。", 404);
  }

  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: {
        role: "ADMIN",
      },
    });
    if (adminCount <= 1) {
      throw new AppError("BAD_REQUEST", "不能删除最后一个管理员。", 400);
    }
  }

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });

  return {
    id: userId,
  };
}
