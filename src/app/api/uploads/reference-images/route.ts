import { getAppErrorMessage } from "@/lib/app-error";
import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createUploadedReferenceImage, MAX_REFERENCE_IMAGE_BYTES } from "@/lib/uploads";

function isReferenceImageUploadEnabled() {
  return false;
}

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再上传参考图。" }, { status: 401 });
  }

  if (!isReferenceImageUploadEnabled()) {
    return NextResponse.json({ ok: false, error: "当前正式版暂未开放参考图上传。" }, { status: 403 });
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
      mimeType: file.type || "application/octet-stream",
    });

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
