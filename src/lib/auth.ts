import { createHmac, pbkdf2Sync, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import { AppError } from "@/lib/app-error";
import { isUsableSecret, safeEqual } from "@/lib/app-crypto";
import { verifyEmailCodeForRegistration } from "@/lib/email-verification";

export const ADMIN_SESSION_COOKIE = "image2_admin_session";
export const USER_SESSION_COOKIE = "image2_user_session";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const configuredNewUserCredits = Number(process.env.NEW_USER_INITIAL_CREDITS || 0);
const DEFAULT_NEW_USER_CREDITS =
  Number.isFinite(configuredNewUserCredits) && configuredNewUserCredits > 0
    ? Math.floor(configuredNewUserCredits)
    : 0;

type SessionRole = "ADMIN" | "USER";
type UserAuthIntent = "auto" | "login" | "register";

type BaseSession = {
  userId: string;
  email: string;
  role: SessionRole;
  exp: number;
};

export type AdminSession = BaseSession & {
  role: "ADMIN";
};

export type UserSession = BaseSession & {
  role: "USER";
};

function createId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || "";
  if (process.env.NODE_ENV === "production" && !isUsableSecret(secret)) {
    throw new AppError("PROVIDER_CONFIG", "AUTH_SECRET 缺失或仍为示例值，生产环境必须配置至少 32 位随机密钥。", 500);
  }

  return secret || "change-me";
}

function assertDatabaseConfigured() {
  if (!process.env.DATABASE_URL) {
    throw new AppError("PROVIDER_CONFIG", "缺少 DATABASE_URL，无法使用登录和用户系统。请先配置数据库连接并同步 Prisma schema。", 500);
  }
}

function encodePayload(payload: BaseSession) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function createSessionValue(payload: Omit<BaseSession, "exp">) {
  const encodedPayload = encodePayload({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });

  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

function shouldUseSecureSessionCookie(request?: Request) {
  const configuredValue = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (configuredValue === "true") {
    return true;
  }
  if (configuredValue === "false") {
    return false;
  }

  const forwardedProto = request?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwardedProto) {
    return forwardedProto === "https";
  }

  if (request) {
    try {
      return new URL(request.url).protocol === "https:";
    } catch {
      return process.env.NODE_ENV === "production";
    }
  }

  return process.env.NODE_ENV === "production";
}

export function getSessionCookieOptions(request: Request | undefined, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureSessionCookie(request),
    path: "/",
    maxAge,
  };
}

function parseSession(value: string | undefined, expectedRole: SessionRole) {
  if (!value) {
    return null;
  }

  const [payloadValue, signature] = value.split(".");
  if (!payloadValue || !signature || !safeEqual(signPayload(payloadValue), signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadValue, "base64url").toString("utf8")) as BaseSession;
    if (payload.role !== expectedRole || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function assertPasswordUsable(password: string) {
  if (password.length < 6) {
    throw new AppError("BAD_REQUEST", "密码至少需要 6 位。", 400);
  }
}

function isUsableAdminPassword(password?: string | null) {
  return isUsableSecret(password, 6);
}

function isUsableAdminEmail(email?: string | null) {
  return Boolean(email && email !== "admin@example.com");
}

export function hashPassword(password: string) {
  const iterations = 120000;
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");

  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) {
    return false;
  }

  const [method, iterationsValue, salt, expectedHash] = storedHash.split("$");
  if (method !== "pbkdf2" || !iterationsValue || !salt || !expectedHash) {
    return false;
  }

  const hash = pbkdf2Sync(password, salt, Number(iterationsValue), 32, "sha256").toString("hex");
  return safeEqual(hash, expectedHash);
}

export function createAdminSessionValue(user: { id: string; email: string }) {
  return createSessionValue({
    userId: user.id,
    email: user.email,
    role: "ADMIN",
  });
}

export function createUserSessionValue(user: { id: string; email: string }) {
  return createSessionValue({
    userId: user.id,
    email: user.email,
    role: "USER",
  });
}

export function setAdminSessionCookie(
  response: NextResponse,
  user: { id: string; email: string },
  request?: Request,
) {
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSessionValue(user),
    getSessionCookieOptions(request, SESSION_TTL_SECONDS),
  );
}

export function setUserSessionCookie(
  response: NextResponse,
  user: { id: string; email: string },
  request?: Request,
) {
  response.cookies.set(
    USER_SESSION_COOKIE,
    createUserSessionValue(user),
    getSessionCookieOptions(request, SESSION_TTL_SECONDS),
  );
}

export function clearAdminSessionCookie(response: NextResponse, request?: Request) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", getSessionCookieOptions(request, 0));
}

export function clearUserSessionCookie(response: NextResponse, request?: Request) {
  response.cookies.set(USER_SESSION_COOKIE, "", getSessionCookieOptions(request, 0));
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  return parseSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value, "ADMIN") as AdminSession | null;
}

export async function getUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  return parseSession(cookieStore.get(USER_SESSION_COOKIE)?.value, "USER") as UserSession | null;
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/console");
  }
  return session;
}

export async function ensureInitialAdmin() {
  assertDatabaseConfigured();

  const { prisma } = await import("@/lib/db");
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!isUsableAdminEmail(email) || !isUsableAdminPassword(password)) {
    const adminCount = await prisma.user.count({
      where: {
        role: "ADMIN",
      },
    });
    if (adminCount > 0) {
      return;
    }

    if (process.env.NODE_ENV === "production") {
      throw new AppError("PROVIDER_CONFIG", "ADMIN_EMAIL 或 ADMIN_PASSWORD 缺失或仍为示例值，生产环境不能初始化默认管理员。", 500);
    }
    return;
  }

  const passwordHash = hashPassword(password!);
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    if (existingUser.role === "ADMIN") {
      // 已是管理员：只补齐缺失的密码，不覆盖已有密码。
      if (!existingUser.passwordHash) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { passwordHash },
        });
      }
      return;
    }

    if (existingUser.passwordHash) {
      // 安全：ADMIN_EMAIL 指向一个已注册的普通用户，绝不静默提权 + 覆盖其密码。
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount > 0) {
        console.error(`[ensureInitialAdmin] ADMIN_EMAIL 指向已注册普通用户 ${email}，已跳过自动提权。`);
        return;
      }
      throw new AppError(
        "PROVIDER_CONFIG",
        "ADMIN_EMAIL 指向一个已注册的普通用户，且系统中没有任何管理员。请更换 ADMIN_EMAIL，或手动在数据库中将该账号提升为管理员。",
        500,
      );
    }

    // 无密码占位账号：允许认领并提权（密码来自运维掌控的 ADMIN_PASSWORD，安全）。
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: "ADMIN", passwordHash },
    });
    return;
  }

  await prisma.user.create({
    data: {
      id: createId("usr"),
      email,
      displayName: "系统管理员",
      role: "ADMIN",
      passwordHash,
    },
  });
}

export async function findAdminByEmail(email: string) {
  assertDatabaseConfigured();

  const { prisma } = await import("@/lib/db");
  const user = await prisma.user.findUnique({
    where: {
      email: normalizeEmail(email),
    },
  });

  if (!user || user.role !== "ADMIN" || !user.email) {
    return null;
  }

  return user;
}

export async function markAdminLoggedIn(userId: string) {
  assertDatabaseConfigured();

  const { prisma } = await import("@/lib/db");
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });
}

export async function changePasswordForSession({
  userId,
  role,
  currentPassword,
  newPassword,
}: {
  userId: string;
  role: SessionRole;
  currentPassword: string;
  newPassword: string;
}) {
  assertDatabaseConfigured();

  if (!currentPassword) {
    throw new AppError("BAD_REQUEST", "请输入当前密码。", 400);
  }
  assertPasswordUsable(newPassword);
  if (currentPassword === newPassword) {
    throw new AppError("BAD_REQUEST", "新密码不能和当前密码相同。", 400);
  }

  const { prisma } = await import("@/lib/db");
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user || user.role !== role || !user.passwordHash) {
    throw new AppError("UNAUTHORIZED", "登录状态已失效，请重新登录。", 401);
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new AppError("UNAUTHORIZED", "当前密码不正确。", 401);
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash: hashPassword(newPassword),
    },
  });
}

export async function loginOrCreateUser(
  email: string,
  password: string,
  verificationCode?: string,
  intent: UserAuthIntent = "auto",
  referralCode?: string,
) {
  assertDatabaseConfigured();

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new AppError("BAD_REQUEST", "请输入邮箱。", 400);
  }
  assertPasswordUsable(password);

  const { prisma } = await import("@/lib/db");
  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    include: {
      creditAccount: true,
    },
  });

  if (existingUser) {
    if (existingUser.role === "ADMIN") {
      throw new AppError("FORBIDDEN", "管理员账号请前往后台登录。", 403);
    }

    if (intent === "register") {
      throw new AppError("CONFLICT", "该邮箱已注册，请直接登录。", 409);
    }

    if (!existingUser.passwordHash) {
      // 安全：不允许用任意密码"认领"没有设过密码的既有账号（否则知道邮箱即可接管）。
      throw new AppError(
        "FORBIDDEN",
        "该账号尚未设置密码，暂不支持密码登录。请通过忘记密码流程设置密码，或联系管理员在后台为你设置密码。",
        403,
      );
    }

    if (!verifyPassword(password, existingUser.passwordHash)) {
      throw new AppError("UNAUTHORIZED", "邮箱或密码错误。", 401);
    }

    const user = await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        lastLoginAt: new Date(),
        creditAccount: existingUser.creditAccount
          ? undefined
          : {
              create: {
                available: 0,
                frozen: 0,
              },
            },
      },
    });
    return user;
  }

  if (intent === "login") {
    throw new AppError("NOT_FOUND", "账号不存在，请先注册。", 404);
  }

  await verifyEmailCodeForRegistration(normalizedEmail, verificationCode);

  const displayName = normalizedEmail.split("@")[0] || "新用户";
  const passwordHash = hashPassword(password);

  // 邀请返积分：仅在活动开启且邀请码有效时记录邀请关系并发放奖励。
  const { getInviteRuntimeConfig } = await import("@/lib/settings");
  const { resolveReferrerByCode, getOrCreateReferralCode, grantReferralRewardsInTx } = await import("@/lib/invite");
  const inviteConfig = await getInviteRuntimeConfig();
  const referrerUserId = inviteConfig.enabled ? await resolveReferrerByCode(referralCode) : null;

  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: createId("usr"),
        email: normalizedEmail,
        displayName,
        role: "USER",
        passwordHash,
        lastLoginAt: new Date(),
        referredById: referrerUserId,
      },
    });

    await tx.creditAccount.create({
      data: {
        userId: user.id,
        available: DEFAULT_NEW_USER_CREDITS,
        frozen: 0,
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId: user.id,
        type: "GRANT",
        amount: DEFAULT_NEW_USER_CREDITS,
        balance: DEFAULT_NEW_USER_CREDITS,
        memo: "新用户注册赠送积分",
      },
    });

    if (referrerUserId) {
      await grantReferralRewardsInTx(tx, {
        inviteeUserId: user.id,
        referrerUserId,
        inviterCredits: inviteConfig.inviterCredits,
        inviteeCredits: inviteConfig.inviteeCredits,
      });
    }

    return user;
  });

  // 提前为新用户生成邀请码，便于其立即分享（失败不影响注册主流程）。
  try {
    await getOrCreateReferralCode(newUser.id);
  } catch {
    // 邀请码可后续惰性生成，忽略此处异常。
  }

  return newUser;
}
