import { consoleError, consoleErrorFromException, consoleOk } from "@/app/api/console/_lib/envelope";
import { getUserSession } from "@/lib/auth";
import { isOAuthProvider, unbindUserOAuthAccount } from "@/lib/oauth";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;

  // 解绑仅面向普通用户；管理员账号不涉及第三方绑定。
  const session = await getUserSession();
  if (!session) {
    return consoleError("未登录或登录已过期。", 401);
  }

  if (!isOAuthProvider(provider)) {
    return consoleError("不支持的登录方式。", 400);
  }

  try {
    await unbindUserOAuthAccount(session.userId, provider);
    return consoleOk(true);
  } catch (error) {
    return consoleErrorFromException(error, "解绑失败。");
  }
}
