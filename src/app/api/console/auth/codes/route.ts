import { consoleOk } from "@/app/api/console/_lib/envelope";
import { getAdminSession, getUserSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const [adminSession, userSession] = await Promise.all([getAdminSession(), getUserSession()]);

  if (adminSession) {
    return consoleOk(["AC_ADMIN"]);
  }
  if (userSession) {
    return consoleOk(["AC_USER"]);
  }
  return consoleOk([]);
}
