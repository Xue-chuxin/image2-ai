import { getAppErrorMessage } from "@/lib/app-error";
import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { unpublishGeneratedImage } from "@/lib/gallery";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再取消发布作品。" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const image = await unpublishGeneratedImage(session.userId, id);

    return NextResponse.json({
      ok: true,
      image,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAppErrorMessage(error, "取消发布作品失败"),
      },
      {
        status: 400,
      },
    );
  }
}
