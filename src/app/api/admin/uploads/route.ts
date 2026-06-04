import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { listAdminUploadedImages } from "@/lib/uploads";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const limit = Number(searchParams.get("limit") || 80);

  try {
    const images = await listAdminUploadedImages({
      q,
      limit,
    });

    return NextResponse.json({
      ok: true,
      images,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "读取上传图失败",
      },
      {
        status: 500,
      },
    );
  }
}
