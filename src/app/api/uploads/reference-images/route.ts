import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { createUploadedReferenceImage, MAX_REFERENCE_IMAGE_BYTES } from "@/lib/uploads";

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再上传参考图。" }, { status: 401 });
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
        error: error instanceof Error ? error.message : "上传参考图失败",
      },
      {
        status: 400,
      },
    );
  }
}
