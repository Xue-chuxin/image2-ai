import { getAppErrorMessage } from "@/lib/app-error";
import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { getUserBillingOverview } from "@/lib/billing";
import { syncPendingRechargeOrdersFromProviderForUser, syncRechargeOrdersFromProviderForUser } from "@/lib/payment-sync";
import { expirePendingRechargeOrders } from "@/lib/recharge-order-expiration";

type PaymentSyncMode = "auto" | "manual";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
  "CDN-Cache-Control": "no-store",
  Expires: "0",
  Pragma: "no-cache",
  "Surrogate-Control": "no-store",
};

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

function parseSyncMode(request: Request): PaymentSyncMode {
  const { searchParams } = new URL(request.url);
  return searchParams.get("mode") === "manual" ? "manual" : "auto";
}

export async function GET(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录用户账号。" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  try {
    const includeOrderIds = parseOrderIds(request);
    const mode = parseSyncMode(request);
    const syncOptions = {
      mode,
      force: mode === "manual",
    };
    await syncRechargeOrdersFromProviderForUser(session.userId, includeOrderIds, syncOptions);
    await syncPendingRechargeOrdersFromProviderForUser(session.userId, { mode: "auto" });
    await expirePendingRechargeOrders(session.userId);
    const overview = await getUserBillingOverview(session.userId, { includeOrderIds });

    return NextResponse.json(
      {
        ok: true,
        balance: overview.balance,
        orders: overview.orders,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAppErrorMessage(error, "读取账户概览失败。"),
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      },
    );
  }
}
