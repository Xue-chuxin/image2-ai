import { consoleError, consoleErrorFromException, consoleOk, getConsoleSession } from "@/app/api/console/_lib/envelope";
import { prisma } from "@/lib/db";
import { listEnabledOAuthProviders, listUserOAuthBindings } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getConsoleSession();
  if (!session) {
    return consoleError("未登录或登录已过期。", 401);
  }

  // 管理员账号不支持第三方登录绑定，返回空数据并标记。
  if (session.isAdmin) {
    return consoleOk({ bindings: [], providers: [], hasPassword: true, isAdmin: true });
  }

  try {
    const [bindings, providers, user] = await Promise.all([
      listUserOAuthBindings(session.userId),
      listEnabledOAuthProviders(),
      prisma.user.findUnique({ where: { id: session.userId }, select: { passwordHash: true } }),
    ]);

    return consoleOk({
      bindings,
      providers,
      hasPassword: Boolean(user?.passwordHash),
      isAdmin: false,
    });
  } catch (error) {
    return consoleErrorFromException(error, "读取第三方绑定失败。");
  }
}
