import { getAppErrorMessage } from "@/lib/app-error";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { getBillingPaymentSettings, saveBillingPaymentSettings } from "@/lib/billing";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  try {
    const settings = await getBillingPaymentSettings();
    return NextResponse.json({
      ok: true,
      settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAppErrorMessage(error, "读取支付配置失败"),
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const settings = await saveBillingPaymentSettings(body as any);

    return NextResponse.json({
      ok: true,
      settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAppErrorMessage(error, "保存支付配置失败"),
      },
      {
        status: 400,
      },
    );
  }
}
