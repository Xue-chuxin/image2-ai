import { consoleError, consoleOk } from "@/app/api/console/_lib/envelope";
import { changePasswordForSession, getAdminSession, getUserSession } from "@/lib/auth";
import { getAppErrorMessage, getAppErrorStatus } from "@/lib/app-error";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "auth:console-change-password", {
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return consoleError(rateLimit.message, 429);
  }

  const [adminSession, userSession] = await Promise.all([getAdminSession(), getUserSession()]);
  const session = adminSession || userSession;
  if (!session) {
    return consoleError("未登录或登录已过期。", 401);
  }

  const payload = (await request.json().catch(() => null)) as {
    currentPassword?: string;
    newPassword?: string;
  } | null;

  try {
    await changePasswordForSession({
      userId: session.userId,
      role: adminSession ? "ADMIN" : "USER",
      currentPassword: payload?.currentPassword || "",
      newPassword: payload?.newPassword || "",
    });
    return consoleOk(true);
  } catch (error) {
    return consoleError(getAppErrorMessage(error, "修改密码失败。"), getAppErrorStatus(error, 400));
  }
}
