import { consoleOk } from "@/app/api/console/_lib/envelope";
import { clearAdminSessionCookie, clearUserSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const response = consoleOk(true);
  clearAdminSessionCookie(response, request);
  clearUserSessionCookie(response, request);
  return response;
}
