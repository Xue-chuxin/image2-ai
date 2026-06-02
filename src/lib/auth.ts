import { createHmac, pbkdf2Sync, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { safeEqual } from "@/lib/app-crypto";

export const ADMIN_SESSION_COOKIE = "image2_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type AdminUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string | null;
  passwordHash: string | null;
};

export type AdminSession = {
  userId: string;
  email: string;
  role: "ADMIN";
  exp: number;
};

function createId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function getAuthSecret() {
  return process.env.AUTH_SECRET || "change-me";
}

function encodePayload(payload: AdminSession) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function assertDatabaseConfigured() {
  if (!process.env.DATABASE_URL) {
    throw new Error("缺少 DATABASE_URL，无法使用管理员登录。请先配置数据库连接并执行 Prisma 迁移。");
  }
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
  const payload = encodePayload({
    userId: user.id,
    email: user.email,
    role: "ADMIN",
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  });

  return `${payload}.${signPayload(payload)}`;
}

export function parseAdminSession(value?: string): AdminSession | null {
  if (!value) {
    return null;
  }

  const [payloadValue, signature] = value.split(".");
  if (!payloadValue || !signature || !safeEqual(signPayload(payloadValue), signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadValue, "base64url").toString("utf8")) as AdminSession;
    if (payload.role !== "ADMIN" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function setAdminSessionCookie(response: NextResponse, user: { id: string; email: string }) {
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionValue(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  return parseAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/signin?next=/admin/settings");
  }
  return session;
}

export async function ensureInitialAdmin() {
  assertDatabaseConfigured();

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password || password === "change-this-password") {
    return;
  }

  const { Prisma } = await import("@prisma/client");
  const { prisma } = await import("@/lib/db");
  const users = await prisma.$queryRaw<AdminUser[]>(
    Prisma.sql`SELECT id, email, "displayName", role, "passwordHash" FROM "User" WHERE email = ${email} LIMIT 1`
  );
  const passwordHash = hashPassword(password);

  if (users[0]) {
    if (users[0].role !== "ADMIN" || !users[0].passwordHash) {
      await prisma.$executeRaw(
        Prisma.sql`UPDATE "User" SET role = 'ADMIN', "passwordHash" = ${passwordHash}, "updatedAt" = now() WHERE id = ${users[0].id}`
      );
    }
    return;
  }

  await prisma.$executeRaw(
    Prisma.sql`INSERT INTO "User" (id, email, "displayName", role, "passwordHash", "createdAt", "updatedAt") VALUES (${createId("usr")}, ${email}, '系统管理员', 'ADMIN', ${passwordHash}, now(), now())`
  );
}

export async function findAdminByEmail(email: string) {
  assertDatabaseConfigured();

  const { Prisma } = await import("@prisma/client");
  const { prisma } = await import("@/lib/db");
  const users = await prisma.$queryRaw<AdminUser[]>(
    Prisma.sql`SELECT id, email, "displayName", role, "passwordHash" FROM "User" WHERE email = ${email.trim().toLowerCase()} LIMIT 1`
  );
  const user = users[0];

  if (!user || user.role !== "ADMIN" || !user.email) {
    return null;
  }

  return user;
}

export async function markAdminLoggedIn(userId: string) {
  assertDatabaseConfigured();

  const { Prisma } = await import("@prisma/client");
  const { prisma } = await import("@/lib/db");
  await prisma.$executeRaw(Prisma.sql`UPDATE "User" SET "lastLoginAt" = now(), "updatedAt" = now() WHERE id = ${userId}`);
}
