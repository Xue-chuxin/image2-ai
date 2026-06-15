import { createHmac, pbkdf2Sync, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import { AppError } from "@/lib/app-error";
import { isUsableSecret, safeEqual } from "@/lib/app-crypto";

export const ADMIN_SESSION_COOKIE = "image2_admin_session";
export const USER_SESSION_COOKIE = "image2_user_session";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const configuredNewUserCredits = Number(process.env.NEW_USER_INITIAL_CREDITS || 0);
const DEFAULT_NEW_USER_CREDITS =
  Number.isFinite(configuredNewUserCredits) && configuredNewUserCredits > 0
    ? Math.floor(configuredNewUserCredits)
    : 0;

type SessionRole = "ADMIN" | "USER";

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
    throw new Error("AUTH_SECRET 缺失或仍为示例值，生产环境必须配置至少 32 位随机密钥。");
  }

  return secret || "change-me";
}

function assertDatabaseConfigured() {
  if (!process.env.DATABASE_URL) {
    throw new Error("缺少 DATABASE_URL，无法使用登录和用户系统。请先配置数据库连接并同步 Prisma schema。");
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
  return isUsableSecret(password, 12);
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

export function setAdminSessionCookie(response: NextResponse, user: { id: string; email: string }) {
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionValue(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function setUserSessionCookie(response: NextResponse, user: { id: string; email: string }) {
  response.cookies.set(USER_SESSION_COOKIE, createUserSessionValue(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function clearUserSessionCookie(response: NextResponse) {
  response.cookies.set(USER_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
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
    redirect("/signin?mode=admin&next=/admin/settings");
  }
  return session;
}

export async function ensureInitialAdmin() {
  assertDatabaseConfigured();

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!isUsableAdminEmail(email) || !isUsableAdminPassword(password)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_EMAIL 或 ADMIN_PASSWORD 缺失或仍为示例值，生产环境不能初始化默认管理员。");
    }
    return;
  }

  const { prisma } = await import("@/lib/db");
  const passwordHash = hashPassword(password!);
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    if (existingUser.role !== "ADMIN" || !existingUser.passwordHash) {
      await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          role: "ADMIN",
          passwordHash,
        },
      });
    }
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

export async function loginOrCreateUser(email: string, password: string) {
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
      throw new AppError("FORBIDDEN", "管理员账号请切换到管理员登录。", 403);
    }

    if (!existingUser.passwordHash) {
      const passwordHash = hashPassword(password);
      const user = await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          passwordHash,
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

  const displayName = normalizedEmail.split("@")[0] || "新用户";
  const passwordHash = hashPassword(password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: createId("usr"),
        email: normalizedEmail,
        displayName,
        role: "USER",
        passwordHash,
        lastLoginAt: new Date(),
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

    return user;
  });
}
