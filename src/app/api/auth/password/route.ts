import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { changePasswordForSession, getAdminSession, getUserSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type ChangePasswordPayload = {
  role?: "admin" | "user";
  currentPassword?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "auth:change-password", {
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const payload = (await request.json().catch(() => null)) as ChangePasswordPayload | null;
  const role = payload?.role === "admin" ? "admin" : "user";
  const session = role === "admin" ? await getAdminSession() : await getUserSession();

  if (!session) {
    return NextResponse.json({ ok: false, error: role === "admin" ? "请先登录管理员账号。" : "请先登录用户账号。" }, { status: 401 });
  }

  try {
    await changePasswordForSession({
      userId: session.userId,
      role: role === "admin" ? "ADMIN" : "USER",
      currentPassword: payload?.currentPassword || "",
      newPassword: payload?.newPassword || "",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, "修改密码失败。");
  }
}
