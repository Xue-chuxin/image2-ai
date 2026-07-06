import { consoleError, consoleOk, getConsoleSession } from "@/app/api/console/_lib/envelope";
import { getUserBillingOverview } from "@/lib/billing";
import { syncPendingRechargeOrdersFromProviderForUser, syncRechargeOrdersFromProviderForUser } from "@/lib/payment-sync";
import { expirePendingRechargeOrders } from "@/lib/recharge-order-expiration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseOrderIds(request: Request) {
  const { searchParams } = new URL(request.url);
  return Array.from(
    new Set(
      (searchParams.get("orderIds") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

function parseSyncMode(request: Request): "auto" | "manual" {
  const { searchParams } = new URL(request.url);
  return searchParams.get("mode") === "manual" ? "manual" : "auto";
}

export async function GET(request: Request) {
  const session = await getConsoleSession();
  if (!session) {
    return consoleError("请先登录用户账号。", 401);
  }

  try {
    const includeOrderIds = parseOrderIds(request);
    const mode = parseSyncMode(request);
    await syncRechargeOrdersFromProviderForUser(session.userId, includeOrderIds, { mode, force: mode === "manual" });
    await syncPendingRechargeOrdersFromProviderForUser(session.userId, { mode: "auto" });
    await expirePendingRechargeOrders(session.userId);
    const overview = await getUserBillingOverview(session.userId, { includeOrderIds });

    return consoleOk(overview);
  } catch (error) {
    return consoleError(error instanceof Error ? error.message : "读取账户概览失败。", 500);
  }
}
