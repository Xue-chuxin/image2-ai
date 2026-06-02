import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getAdminAppSettings, saveAdminAppSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录管理员账号。" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, settings: await getAdminAppSettings() });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录管理员账号。" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  try {
    await saveAdminAppSettings(payload);
    return NextResponse.json({ ok: true, settings: await getAdminAppSettings() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "保存配置失败。" },
      { status: 500 }
    );
  }
}
