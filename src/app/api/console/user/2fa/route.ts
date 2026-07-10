import { consoleError, consoleOk } from "@/app/api/console/_lib/envelope";
import { getAdminSession, getUserSession, verifyPassword } from "@/lib/auth";
import { getAppErrorMessage, getAppErrorStatus } from "@/lib/app-error";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getEmailRuntimeConfig } from "@/lib/settings";

export const runtime = "nodejs";

async function resolveSession() {
  const [adminSession, userSession] = await Promise.all([getAdminSession(), getUserSession()]);
  return adminSession || userSession;
}

/** 查询当前账号的二步验证开关状态与是否具备开启条件。 */
export async function GET() {
  const session = await resolveSession();
  if (!session) {
    return consoleError("未登录或登录已过期。", 401);
  }

  const [user, emailConfig] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { twoFactorEnabled: true, passwordHash: true, email: true },
    }),
    getEmailRuntimeConfig(),
  ]);

  if (!user) {
    return consoleError("账号不存在。", 404);
  }

  return consoleOk({
    enabled: user.twoFactorEnabled,
    hasPassword: Boolean(user.passwordHash),
    emailEnabled: emailConfig.enabled,
    // 开启二步验证需具备邮箱、密码与可用的 SMTP 发信。
    canEnable: Boolean(user.email) && Boolean(user.passwordHash) && emailConfig.enabled,
  });
}

/** 开启/关闭二步验证，需校验当前密码。 */
export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "auth:console-2fa", {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return consoleError(rateLimit.message, 429);
  }

  const session = await resolveSession();
  if (!session) {
    return consoleError("未登录或登录已过期。", 401);
  }

  const payload = (await request.json().catch(() => null)) as {
    enable?: boolean;
    currentPassword?: string;
  } | null;

  const enable = Boolean(payload?.enable);
  const currentPassword = payload?.currentPassword || "";

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true, email: true, twoFactorEnabled: true },
    });
    if (!user) {
      return consoleError("账号不存在。", 404);
    }
    if (!user.passwordHash) {
      return consoleError("请先设置登录密码后再开启二步验证。", 400);
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return consoleError("当前密码不正确。", 401);
    }

    if (enable) {
      if (!user.email) {
        return consoleError("账号缺少邮箱，无法开启二步验证。", 400);
      }
      const emailConfig = await getEmailRuntimeConfig();
      if (!emailConfig.enabled) {
        return consoleError("系统未启用邮件发送，开启二步验证后将无法登录，请联系管理员。", 400);
      }
    }

    if (user.twoFactorEnabled !== enable) {
      await prisma.user.update({
        where: { id: session.userId },
        data: { twoFactorEnabled: enable },
      });
    }

    return consoleOk({ enabled: enable });
  } catch (error) {
    return consoleError(getAppErrorMessage(error, "操作失败，请稍后再试。"), getAppErrorStatus(error, 400));
  }
}
