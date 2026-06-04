import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { takeDownGalleryImageByAdmin } from "@/lib/gallery";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const { id } = await context.params;
    const image = await takeDownGalleryImageByAdmin(id, body.reason);

    return NextResponse.json({
      ok: true,
      image,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "下架作品失败",
      },
      {
        status: 400,
      },
    );
  }
}
