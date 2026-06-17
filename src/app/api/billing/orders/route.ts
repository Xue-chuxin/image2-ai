import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { createRechargeOrder, listUserRechargeOrders } from "@/lib/billing";
import { scheduleRechargeOrderAutoSync } from "@/lib/payment-sync";
import { normalizePaymentProvider } from "@/lib/payments";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
  "CDN-Cache-Control": "no-store",
  Expires: "0",
  Pragma: "no-cache",
  "Surrogate-Control": "no-store",
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getPublicOrigin(request: Request) {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
}

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录用户账号。" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  try {
    const orders = await listUserRechargeOrders(session.userId, 20);
    return NextResponse.json(
      {
        ok: true,
        orders,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "读取充值订单失败",
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      },
    );
  }
}

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录用户账号后再充值。" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const rateLimit = checkRateLimit(request, `billing:create-order:${session.userId}`, {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: rateLimit.message },
      { status: 429, headers: { ...NO_STORE_HEADERS, "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const packageId = normalizeString(body.packageId);
    const provider = normalizePaymentProvider(body.provider);

    if (!packageId) {
      return NextResponse.json({ ok: false, error: "请选择积分套餐。" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const origin = getPublicOrigin(request);
    const order = await createRechargeOrder(session.userId, packageId, provider, origin);
    if (order.provider === "alipay_f2f") {
      scheduleRechargeOrderAutoSync(session.userId, order.id);
    }
    return NextResponse.json(
      {
        ok: true,
        order,
      },
      {
        status: 201,
        headers: NO_STORE_HEADERS,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "创建充值订单失败",
      },
      {
        status: 400,
        headers: NO_STORE_HEADERS,
      },
    );
  }
}
