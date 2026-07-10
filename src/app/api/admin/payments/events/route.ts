import { getAppErrorMessage } from "@/lib/app-error";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { listAdminPaymentEvents } from "@/lib/payment-diagnostics";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const events = await listAdminPaymentEvents({
      provider: searchParams.get("provider"),
      status: searchParams.get("status"),
      q: searchParams.get("q"),
      limit: Number(searchParams.get("limit") || 80),
    });

    return NextResponse.json({
      ok: true,
      events,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAppErrorMessage(error, "读取支付事件失败。"),
      },
      {
        status: 500,
      },
    );
  }
}
