import { NextResponse } from "next/server";
import { ensureInitialAdmin, findAdminByEmail, markAdminLoggedIn, setAdminSessionCookie, verifyPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "auth:admin-login", {
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const payload = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = payload?.email?.trim().toLowerCase();
  const password = payload?.password || "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "请输入管理员邮箱和密码。" }, { status: 400 });
  }

  try {
    await ensureInitialAdmin();
    const user = await findAdminByEmail(email);

    if (!user || !user.email || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ ok: false, error: "管理员账号或密码错误。" }, { status: 401 });
    }

    await markAdminLoggedIn(user.id);
    const response = NextResponse.json({ ok: true });
    setAdminSessionCookie(response, { id: user.id, email: user.email }, request);
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "登录失败，请检查数据库和管理员配置。" },
      { status: 500 }
    );
  }
}
