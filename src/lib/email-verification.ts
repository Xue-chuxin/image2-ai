import { createHmac, randomInt } from "crypto";

import { AppError } from "@/lib/app-error";
import { safeEqual } from "@/lib/app-crypto";
import { prisma } from "@/lib/db";
import { sendSystemEmail } from "@/lib/email";

export type EmailVerificationPurpose = "register" | "password_reset";

const CODE_TTL_MS = 10 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function assertEmail(value: unknown) {
  const email = normalizeEmail(value);
  if (!email) {
    throw new AppError("BAD_REQUEST", "请输入邮箱。", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("BAD_REQUEST", "邮箱格式不正确。", 400);
  }
  return email;
}

function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function verificationSecret() {
  return process.env.AUTH_SECRET || "change-me";
}

function hashVerificationCode(email: string, purpose: EmailVerificationPurpose, code: string) {
  return createHmac("sha256", verificationSecret()).update(`${purpose}:${email}:${code}`).digest("hex");
}

function generateCode() {
  return randomInt(0, 1000000).toString().padStart(6, "0");
}

function buildVerificationEmail(code: string) {
  const text = [
    "你正在注册造图台账号。",
    "",
    `验证码：${code}`,
    "",
    "验证码 10 分钟内有效。如果不是你本人操作，请忽略这封邮件。",
  ].join("\n");
  const html = [
    "<p>你正在注册造图台账号。</p>",
    `<p style="font-size:24px;font-weight:800;letter-spacing:4px;">${code}</p>`,
    "<p>验证码 10 分钟内有效。如果不是你本人操作，请忽略这封邮件。</p>",
  ].join("");

  return {
    subject: "造图台注册验证码",
    text,
    html,
  };
}

export async function sendEmailVerificationCode(emailInput: unknown, purpose: EmailVerificationPurpose = "register") {
  const email = assertEmail(emailInput);

  if (purpose !== "register") {
    throw new AppError("BAD_REQUEST", "当前仅支持发送注册验证码。", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      role: true,
    },
  });

  if (existingUser?.role === "ADMIN") {
    throw new AppError("FORBIDDEN", "管理员账号请前往后台登录。", 403);
  }
  if (existingUser) {
    throw new AppError("CONFLICT", "该邮箱已注册，请直接登录。", 409);
  }

  const now = new Date();
  const latestCode = await prisma.emailVerificationCode.findFirst({
    where: {
      email,
      purpose,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
    },
  });

  if (latestCode) {
    const retryAfterSeconds = Math.ceil((SEND_COOLDOWN_MS - (now.getTime() - latestCode.createdAt.getTime())) / 1000);
    if (retryAfterSeconds > 0) {
      throw new AppError("RATE_LIMITED", `验证码已发送，请 ${retryAfterSeconds} 秒后再试。`, 429);
    }
  }

  const code = generateCode();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationCode.updateMany({
      where: {
        email,
        purpose,
        consumedAt: null,
      },
      data: {
        consumedAt: now,
      },
    });

    await tx.emailVerificationCode.create({
      data: {
        email,
        purpose,
        codeHash: hashVerificationCode(email, purpose, code),
        expiresAt,
      },
    });
  });

  await sendSystemEmail({
    to: email,
    ...buildVerificationEmail(code),
  });

  return {
    email,
    expiresAt,
  };
}

export async function verifyEmailCodeForRegistration(emailInput: unknown, codeInput: unknown) {
  const email = assertEmail(emailInput);
  const code = normalizeCode(codeInput);

  if (!code) {
    throw new AppError("BAD_REQUEST", "请先发送并输入邮箱验证码。", 400);
  }
  if (!/^\d{6}$/.test(code)) {
    throw new AppError("BAD_REQUEST", "邮箱验证码应为 6 位数字。", 400);
  }

  const record = await prisma.emailVerificationCode.findFirst({
    where: {
      email,
      purpose: "register",
      consumedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!record) {
    throw new AppError("BAD_REQUEST", "请先发送并输入邮箱验证码。", 400);
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationCode.update({
      where: {
        id: record.id,
      },
      data: {
        consumedAt: new Date(),
      },
    });
    throw new AppError("BAD_REQUEST", "邮箱验证码已过期，请重新获取。", 400);
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    await prisma.emailVerificationCode.update({
      where: {
        id: record.id,
      },
      data: {
        consumedAt: new Date(),
      },
    });
    throw new AppError("BAD_REQUEST", "邮箱验证码错误次数过多，请重新获取。", 400);
  }

  const expectedHash = hashVerificationCode(email, "register", code);
  if (!safeEqual(expectedHash, record.codeHash)) {
    await prisma.emailVerificationCode.update({
      where: {
        id: record.id,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
    throw new AppError("UNAUTHORIZED", "邮箱验证码不正确。", 401);
  }

  await prisma.emailVerificationCode.update({
    where: {
      id: record.id,
    },
    data: {
      attempts: {
        increment: 1,
      },
      consumedAt: new Date(),
    },
  });

  return email;
}
