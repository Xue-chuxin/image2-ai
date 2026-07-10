import type { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { invalidateSettingsCache } from "@/lib/settings";

let seq = 0;

/** 建一个用户（默认普通用户），可指定邮箱/角色/邀请码。 */
export async function createUser(options?: {
  email?: string;
  role?: UserRole;
  referralCode?: string;
  referredById?: string;
}) {
  seq += 1;
  return prisma.user.create({
    data: {
      email: options?.email ?? `user${seq}-${Date.now()}@test.local`,
      role: options?.role ?? "USER",
      referralCode: options?.referralCode ?? null,
      referredById: options?.referredById ?? null,
    },
  });
}

/** 建用户并附带积分账户，初始化 available/frozen。 */
export async function createUserWithAccount(options?: {
  available?: number;
  frozen?: number;
  role?: UserRole;
  email?: string;
}) {
  const user = await createUser({ role: options?.role, email: options?.email });
  const account = await prisma.creditAccount.create({
    data: {
      userId: user.id,
      available: options?.available ?? 0,
      frozen: options?.frozen ?? 0,
    },
  });
  return { user, account };
}

/** 读取账户当前 available/frozen（不存在返回 null）。 */
export async function getAccount(userId: string) {
  return prisma.creditAccount.findUnique({ where: { userId } });
}

/** 读取某用户的流水（升序），便于断言台账。 */
export async function listTransactions(userId: string) {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

/** 批量写入 AppSetting 配置项并清缓存，供审核/邀请等运行时 config 读取。 */
export async function seedSettings(entries: Record<string, string>) {
  for (const [key, value] of Object.entries(entries)) {
    await prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  invalidateSettingsCache();
}
