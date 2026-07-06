import { consoleError, consoleOk } from "@/app/api/console/_lib/envelope";
import {
  ensureInitialAdmin,
  findAdminByEmail,
  loginOrCreateUser,
  markAdminLoggedIn,
  setAdminSessionCookie,
  setUserSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { getAppErrorMessage, getAppErrorStatus } from "@/lib/app-error";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "auth:console-login", {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return consoleError(rateLimit.message, 429);
  }

  const payload = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  const email = payload?.username?.trim().toLowerCase();
  const password = payload?.password || "";

  if (!email || !password) {
    return consoleError("请输入邮箱和密码。", 400);
  }

  try {
    // 管理员账号走后台会话，普通账号走用户会话，同一个登录入口。
    await ensureInitialAdmin().catch(() => null);
    const admin = await findAdminByEmail(email);

    if (admin) {
      if (!admin.email || !verifyPassword(password, admin.passwordHash)) {
        return consoleError("账号或密码错误。", 401);
      }
      await markAdminLoggedIn(admin.id);
      const response = consoleOk({ accessToken: "cookie-session" });
      setAdminSessionCookie(response, { id: admin.id, email: admin.email }, request);
      return response;
    }

    const user = await loginOrCreateUser(email, password, undefined, "login");
    const response = consoleOk({ accessToken: "cookie-session" });
    setUserSessionCookie(response, { id: user.id, email: user.email || email }, request);
    return response;
  } catch (error) {
    return consoleError(getAppErrorMessage(error, "登录失败，请稍后再试。"), getAppErrorStatus(error, 500));
  }
}
