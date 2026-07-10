import { randomBytes } from "crypto";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getInviteRuntimeConfig, type InviteRuntimeConfig } from "@/lib/settings";

const INVITER_REWARD_MEMO = "邀请好友注册奖励";
const INVITEE_REWARD_MEMO = "受邀注册奖励";
const REFERRAL_CODE_LENGTH = 8;

// 生成去除易混淆字符的短邀请码。
export function createReferralCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(REFERRAL_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

/** 返回用户的邀请码，未生成时惰性生成并写库（带唯一冲突重试）。 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  if (existing?.referralCode) {
    return existing.referralCode;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createReferralCode();
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      });
      return updated.referralCode ?? code;
    } catch (error) {
      // 唯一冲突（P2002）时重试换一个码；其它错误直接抛出。
      if ((error as { code?: string }).code === "P2002") {
        continue;
      }
      throw error;
    }
  }

  throw new Error("生成邀请码失败，请稍后再试。");
}

/** 依据邀请码解析邀请人（必须是仍存在的普通用户）。 */
export async function resolveReferrerByCode(code: string | null | undefined): Promise<string | null> {
  const clean = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!clean) {
    return null;
  }

  const referrer = await prisma.user.findUnique({
    where: { referralCode: clean },
    select: { id: true, role: true },
  });

  if (!referrer || referrer.role !== "USER") {
    return null;
  }

  return referrer.id;
}

/**
 * 在注册事务内发放邀请奖励：给新用户（其账户已在同一事务创建）与邀请人各加积分。
 * 调用方需保证 referrerUserId 已校验有效且不等于 inviteeUserId。
 */
export async function grantReferralRewardsInTx(
  tx: Prisma.TransactionClient,
  params: {
    inviteeUserId: string;
    referrerUserId: string;
    inviterCredits: number;
    inviteeCredits: number;
  },
) {
  const { inviteeUserId, referrerUserId, inviterCredits, inviteeCredits } = params;

  if (inviteeCredits > 0) {
    const inviteeAccount = await tx.creditAccount.update({
      where: { userId: inviteeUserId },
      data: { available: { increment: inviteeCredits } },
    });
    await tx.creditTransaction.create({
      data: {
        userId: inviteeUserId,
        type: "GRANT",
        amount: inviteeCredits,
        balance: inviteeAccount.available,
        memo: INVITEE_REWARD_MEMO,
      },
    });
  }

  if (inviterCredits > 0) {
    await tx.creditAccount.upsert({
      where: { userId: referrerUserId },
      update: { available: { increment: inviterCredits } },
      create: { userId: referrerUserId, available: inviterCredits, frozen: 0 },
    });
    const inviterAccount = await tx.creditAccount.findUniqueOrThrow({
      where: { userId: referrerUserId },
    });
    await tx.creditTransaction.create({
      data: {
        userId: referrerUserId,
        type: "GRANT",
        amount: inviterCredits,
        balance: inviterAccount.available,
        memo: INVITER_REWARD_MEMO,
      },
    });
  }
}

export type InviteSummary = {
  enabled: boolean;
  code: string;
  invitedCount: number;
  rewardTotal: number;
  inviterCredits: number;
  inviteeCredits: number;
};

/** 用户邀请概览：邀请码、已邀请人数、累计返积分与当前活动配置。 */
export async function getInviteSummary(userId: string): Promise<InviteSummary> {
  const config: InviteRuntimeConfig = await getInviteRuntimeConfig();
  const [code, invitedCount, rewardAgg] = await Promise.all([
    getOrCreateReferralCode(userId),
    prisma.user.count({ where: { referredById: userId } }),
    prisma.creditTransaction.aggregate({
      where: { userId, memo: INVITER_REWARD_MEMO },
      _sum: { amount: true },
    }),
  ]);

  return {
    enabled: config.enabled,
    code,
    invitedCount,
    rewardTotal: rewardAgg._sum.amount ?? 0,
    inviterCredits: config.inviterCredits,
    inviteeCredits: config.inviteeCredits,
  };
}
