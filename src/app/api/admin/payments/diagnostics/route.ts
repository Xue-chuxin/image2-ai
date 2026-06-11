import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { getPaymentDiagnostics } from "@/lib/payment-diagnostics";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  try {
    const origin = new URL(request.url).origin;
    const diagnostics = await getPaymentDiagnostics(process.env.NEXT_PUBLIC_SITE_URL || origin);
    return NextResponse.json({
      ok: true,
      diagnostics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "读取支付诊断失败。",
      },
      {
        status: 500,
      },
    );
  }
}
