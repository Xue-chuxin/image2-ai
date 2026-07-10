import { getAppErrorMessage } from "@/lib/app-error";
import { consoleError, consoleOk, getConsoleSession } from "@/app/api/console/_lib/envelope";
import { listUserCreditTransactions } from "@/lib/credits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getConsoleSession();
  if (!session) {
    return consoleError("请先登录用户账号。", 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 50;
    const transactions = await listUserCreditTransactions(session.userId, limit);
    return consoleOk(transactions);
  } catch (error) {
    return consoleError(getAppErrorMessage(error, "读取积分流水失败。"), 500);
  }
}
