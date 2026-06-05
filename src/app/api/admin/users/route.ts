import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { listAdminUsers } from "@/lib/admin-users";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const users = await listAdminUsers({
      q: searchParams.get("q"),
      limit: Number(searchParams.get("limit") || 80),
    });

    return NextResponse.json({
      ok: true,
      users,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "读取用户列表失败。",
      },
      {
        status: 500,
      },
    );
  }
}
