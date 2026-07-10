import { prisma } from "@/lib/db";
import { sendSystemEmail } from "@/lib/email";
import { buildMembershipReminderEmail, getEmailBrand, type EmailBrand } from "@/lib/email-templates";
import { getEmailRuntimeConfig, getMembershipRuntimeConfig } from "@/lib/settings";

const DAY_MS = 24 * 60 * 60 * 1000;
// 已到期提醒只回溯最近一段时间，避免功能上线时对历史早已过期的会员补发骚扰邮件。
const EXPIRED_LOOKBACK_MS = 7 * DAY_MS;
const REMINDER_BATCH = 200;
const REMINDER_THROTTLE_MS = 60 * 60 * 1000;

let lastReminderAt = 0;

type SubscriptionRow = {
  id: string;
  packageName: string;
  expiresAt: Date;
  expiringRemindedFor: Date | null;
  expiredRemindedFor: Date | null;
  user: { email: string | null };
};

function daysRemaining(expiresAt: Date, now: number) {
  return Math.max(1, Math.ceil((expiresAt.getTime() - now) / DAY_MS));
}

async function sendReminder(
  brand: EmailBrand,
  row: SubscriptionRow,
  expired: boolean,
  now: number,
): Promise<boolean> {
  const email = row.user.email?.trim();
  if (!email) {
    return false;
  }

  try {
    const mail = buildMembershipReminderEmail(brand, {
      packageName: row.packageName,
      expiresAt: row.expiresAt,
      daysRemaining: daysRemaining(row.expiresAt, now),
      expired,
    });
    await sendSystemEmail({ to: email, ...mail });
    return true;
  } catch (error) {
    console.error("[membership] 到期提醒邮件发送失败", row.id, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * 扫描并发送会员到期提醒邮件（到期前提醒 + 已到期提醒），各自幂等去重。
 * 发送成功后才回写去重标记，失败留待下轮重试。
 */
export async function sendDueMembershipReminders(): Promise<{ expiring: number; expired: number }> {
  const config = await getMembershipRuntimeConfig();
  if (config.expiryReminderDays <= 0) {
    return { expiring: 0, expired: 0 };
  }

  const emailConfig = await getEmailRuntimeConfig();
  if (!emailConfig.enabled) {
    return { expiring: 0, expired: 0 };
  }

  const now = Date.now();
  const nowDate = new Date(now);
  const upcomingCutoff = new Date(now + config.expiryReminderDays * DAY_MS);
  const expiredFloor = new Date(now - EXPIRED_LOOKBACK_MS);

  const select = {
    id: true,
    packageName: true,
    expiresAt: true,
    expiringRemindedFor: true,
    expiredRemindedFor: true,
    user: { select: { email: true } },
  } as const;

  const [upcoming, expiredRows] = await Promise.all([
    prisma.subscription.findMany({
      where: { expiresAt: { gt: nowDate, lte: upcomingCutoff } },
      select,
      take: REMINDER_BATCH,
    }),
    prisma.subscription.findMany({
      where: { expiresAt: { lte: nowDate, gte: expiredFloor } },
      select,
      take: REMINDER_BATCH,
    }),
  ]);

  const brand = await getEmailBrand();
  let expiringSent = 0;
  let expiredSent = 0;

  for (const row of upcoming) {
    // 该 expiresAt 已提醒过则跳过；续期后 expiresAt 变化会重新提醒。
    if (row.expiringRemindedFor && row.expiringRemindedFor.getTime() === row.expiresAt.getTime()) {
      continue;
    }
    if (await sendReminder(brand, row, false, now)) {
      await prisma.subscription.update({
        where: { id: row.id },
        data: { expiringRemindedFor: row.expiresAt },
      });
      expiringSent += 1;
    }
  }

  for (const row of expiredRows) {
    if (row.expiredRemindedFor && row.expiredRemindedFor.getTime() === row.expiresAt.getTime()) {
      continue;
    }
    if (await sendReminder(brand, row, true, now)) {
      await prisma.subscription.update({
        where: { id: row.id },
        data: { expiredRemindedFor: row.expiresAt },
      });
      expiredSent += 1;
    }
  }

  return { expiring: expiringSent, expired: expiredSent };
}

/**
 * 惰性触发到期提醒扫描（进程内每小时最多一次）。
 * 适合挂在登录用户高频访问的接口后，无需常驻进程；多实例可另配 cron 调用 sendDueMembershipReminders。
 */
export function maybeSendMembershipReminders(): void {
  const now = Date.now();
  if (now - lastReminderAt < REMINDER_THROTTLE_MS) {
    return;
  }
  lastReminderAt = now;

  sendDueMembershipReminders().catch((error) => {
    console.error("[membership] 到期提醒扫描失败", error);
  });
}
