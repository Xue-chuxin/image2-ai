import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { getUserSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPublicAppSettings } from "@/lib/settings";
import { createReferenceFromGeneratedImage } from "@/lib/uploads";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/** 以某张生成图为参考图「生成变体」：复刻为当前用户的参考图并返回，供跳转创作页带入。 */
export async function POST(request: Request, context: RouteContext) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再生成变体。" }, { status: 401 });
  }

  const { referenceImagesEnabled } = await getPublicAppSettings();
  if (!referenceImagesEnabled) {
    return NextResponse.json({ ok: false, error: "管理员暂未开放参考图功能。" }, { status: 403 });
  }

  const rateLimit = checkRateLimit(request, `remix:${session.userId}`, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  try {
    const { id } = await context.params;
    const image = await createReferenceFromGeneratedImage({
      userId: session.userId,
      imageId: id,
      origin: new URL(request.url).origin,
    });
    return NextResponse.json({ ok: true, image });
  } catch (error) {
    return jsonError(error, "生成变体失败。");
  }
}
