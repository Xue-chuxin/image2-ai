import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { getAdminHealthReport } from "@/lib/admin-health";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  try {
    const origin = new URL(request.url).origin;
    const report = await getAdminHealthReport(process.env.NEXT_PUBLIC_SITE_URL || origin);
    return NextResponse.json({
      ok: true,
      report,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "读取上线自检失败。",
      },
      {
        status: 500,
      },
    );
  }
}
