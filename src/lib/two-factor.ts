import { createHmac, randomInt } from "crypto";

import { AppError } from "@/lib/app-error";
import { safeEqual } from "@/lib/app-crypto";
import { getAuthSecret } from "@/lib/auth-secret";
import { prisma } from "@/lib/db";
import { sendSystemEmail } from "@/lib/email";
import { buildTwoFactorCodeEmail, getEmailBrand } from "@/lib/email-templates";
import { getEmailRuntimeConfig } from "@/lib/settings";

/**
 * 登录二步验证（邮箱验证码）。
 * 复用 EmailVerificationCode 表，purpose = "login_2fa"，与注册验证码互不干扰。
 */

const TWO_FACTOR_PURPOSE = "login_2fa";
const CODE_TTL_MS = 10 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

function hashCode(email: string, code: string) {
  return createHmac("sha256", getAuthSecret()).update(`${TWO_FACTOR_PURPOSE}:${email}:${code}`).digest("hex");
}

function generateCode() {
  return randomInt(0, 1000000).toString().padStart(6, "0");
}

function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 发送登录二步验证码（带 60 秒节流，节流内静默复用上一封，不重复发信也不报错）。
 * 依赖 SMTP 已启用；未启用时抛错交由调用方处理。
 */
export async function sendLoginTwoFactorCode(email: string): Promise<void> {
  const emailConfig = await getEmailRuntimeConfig();
  if (!emailConfig.enabled) {
    throw new AppError("PROVIDER_CONFIG", "系统未启用邮件发送，无法完成二步验证，请联系管理员。", 500);
  }

  const now = new Date();
  const latest = await prisma.emailVerificationCode.findFirst({
    where: { email, purpose: TWO_FACTOR_PURPOSE, consumedAt: null },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  // 冷却期内不重复发信，避免用户连点或前端重试触发轰炸；旧验证码仍然有效。
  if (latest && now.getTime() - latest.createdAt.getTime() < SEND_COOLDOWN_MS) {
    return;
  }

  const code = generateCode();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationCode.updateMany({
      where: { email, purpose: TWO_FACTOR_PURPOSE, consumedAt: null },
      data: { consumedAt: now },
    });
    await tx.emailVerificationCode.create({
      data: {
        email,
        purpose: TWO_FACTOR_PURPOSE,
        codeHash: hashCode(email, code),
        expiresAt,
      },
    });
  });

  const brand = await getEmailBrand();
  await sendSystemEmail({ to: email, ...buildTwoFactorCodeEmail(brand, { code }) });
}

/** 校验登录二步验证码；成功即消费，失败累计尝试次数。 */
export async function verifyLoginTwoFactorCode(email: string, codeInput: unknown): Promise<void> {
  const code = normalizeCode(codeInput);
  if (!code) {
    throw new AppError("BAD_REQUEST", "请输入邮箱验证码。", 400);
  }
  if (!/^\d{6}$/.test(code)) {
    throw new AppError("BAD_REQUEST", "邮箱验证码应为 6 位数字。", 400);
  }

  const record = await prisma.emailVerificationCode.findFirst({
    where: { email, purpose: TWO_FACTOR_PURPOSE, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AppError("BAD_REQUEST", "请先获取邮箱验证码。", 400);
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    throw new AppError("BAD_REQUEST", "验证码已过期，请重新获取。", 400);
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    throw new AppError("BAD_REQUEST", "验证码错误次数过多，请重新获取。", 400);
  }

  if (!safeEqual(hashCode(email, code), record.codeHash)) {
    await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new AppError("UNAUTHORIZED", "邮箱验证码不正确。", 401);
  }

  await prisma.emailVerificationCode.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 }, consumedAt: new Date() },
  });
}

export type TwoFactorGate = { required: true } | { required: false };

/**
 * 登录流程中的二步验证闸门（密码校验通过后调用）。
 * - 账号未开启二步验证：直接放行。
 * - 已开启但未带验证码：发码并要求前端进入验证码步骤（required=true）。
 * - 已开启且带验证码：校验，通过则放行，否则抛错。
 */
export async function enforceLoginTwoFactor(params: {
  email: string;
  enabled: boolean;
  code?: unknown;
}): Promise<TwoFactorGate> {
  if (!params.enabled) {
    return { required: false };
  }

  const email = params.email.trim().toLowerCase();
  if (!email) {
    // 理论上不会发生：开启二步验证的账号必然有邮箱。
    throw new AppError("BAD_REQUEST", "账号缺少邮箱，无法完成二步验证。", 400);
  }

  const code = normalizeCode(params.code);
  if (!code) {
    await sendLoginTwoFactorCode(email);
    return { required: true };
  }

  await verifyLoginTwoFactorCode(email, code);
  return { required: false };
}
