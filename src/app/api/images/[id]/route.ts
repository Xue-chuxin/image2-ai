import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { softDeleteGeneratedImage } from "@/lib/gallery";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再删除作品。" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const image = await softDeleteGeneratedImage(session.userId, id);

    return NextResponse.json({
      ok: true,
      image,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "删除作品失败",
      },
      {
        status: 400,
      },
    );
  }
}
