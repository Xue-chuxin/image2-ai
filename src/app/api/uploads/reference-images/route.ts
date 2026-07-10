import { getAppErrorMessage } from "@/lib/app-error";
import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPublicAppSettings } from "@/lib/settings";
import { createUploadedReferenceImage, maybePurgeExpiredReferenceImages, MAX_REFERENCE_IMAGE_BYTES } from "@/lib/uploads";

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再上传参考图。" }, { status: 401 });
  }

  const { referenceImagesEnabled, referenceImageRetentionDays } = await getPublicAppSettings();
  if (!referenceImagesEnabled) {
    return NextResponse.json({ ok: false, error: "管理员暂未开放参考图上传。" }, { status: 403 });
  }

  const rateLimit = checkRateLimit(request, `upload:reference:${session.userId}`, {
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
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "请选择要上传的图片文件。" }, { status: 400 });
    }

    if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
      return NextResponse.json({ ok: false, error: "参考图不能超过 8MB。" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await createUploadedReferenceImage({
      userId: session.userId,
      buffer,
    });

    // 上传成功后惰性触发一次过期参考图清理（带节流），无需额外后台进程。
    maybePurgeExpiredReferenceImages(referenceImageRetentionDays);

    return NextResponse.json({
      ok: true,
      image,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAppErrorMessage(error, "上传参考图失败"),
      },
      {
        status: 400,
      },
    );
  }
}
