import { getAppErrorMessage } from "@/lib/app-error";
import { consoleError, consoleOk, getConsoleSession } from "@/app/api/console/_lib/envelope";
import { cancelRechargeOrderForUser } from "@/lib/billing";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = "nodejs";

export async function POST(_request: Request, context: RouteContext) {
  const session = await getConsoleSession();
  if (!session) {
    return consoleError("请先登录用户账号。", 401);
  }

  const { id } = await context.params;

  try {
    const order = await cancelRechargeOrderForUser(session.userId, id);
    return consoleOk(order);
  } catch (error) {
    return consoleError(getAppErrorMessage(error, "取消订单失败。"), 400);
  }
}
