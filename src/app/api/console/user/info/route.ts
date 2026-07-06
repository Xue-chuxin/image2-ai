import { consoleError, consoleOk } from "@/app/api/console/_lib/envelope";
import { getAdminSession, getUserSession } from "@/lib/auth";
import { getUserCreditBalance } from "@/lib/credits";

export const runtime = "nodejs";

function displayNameFromEmail(email: string) {
  return email.split("@")[0] || email;
}

export async function GET() {
  const [adminSession, userSession] = await Promise.all([getAdminSession(), getUserSession()]);
  const session = adminSession || userSession;

  if (!session) {
    return consoleError("未登录或登录已过期。", 401);
  }

  const isAdmin = Boolean(adminSession);
  let credits: number | null = null;
  try {
    const balance = await getUserCreditBalance(session.userId);
    credits = balance.available;
  } catch {
    credits = null;
  }

  return consoleOk({
    userId: session.userId,
    username: session.email,
    realName: displayNameFromEmail(session.email),
    avatar: "",
    roles: isAdmin ? ["admin"] : ["user"],
    homePath: isAdmin ? "/dashboard" : "/account/overview",
    credits,
  });
}
