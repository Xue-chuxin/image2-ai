import { getAppErrorMessage } from "@/lib/app-error";
import { NextResponse } from "next/server";

import { getAdminDashboardReport } from "@/lib/admin-dashboard";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  try {
    const report = await getAdminDashboardReport();
    return NextResponse.json({
      ok: true,
      report,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAppErrorMessage(error, "读取运营概览失败。"),
      },
      {
        status: 500,
      },
    );
  }
}
