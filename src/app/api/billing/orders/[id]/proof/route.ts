import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { submitRechargeOrderPaymentProofForUser } from "@/lib/billing";
import { savePaymentProof } from "@/lib/storage";

const MAX_PAYMENT_PROOF_BYTES = 8 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录用户账号。" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "请选择付款截图。" }, { status: 400 });
    }

    if (file.size > MAX_PAYMENT_PROOF_BYTES) {
      return NextResponse.json({ ok: false, error: "付款截图不能超过 8MB。" }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    if (!allowedMimeTypes.has(mimeType)) {
      return NextResponse.json({ ok: false, error: "付款截图仅支持 PNG、JPG 或 WebP。" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await savePaymentProof(session.userId, id, buffer, mimeType);
    const order = await submitRechargeOrderPaymentProofForUser({
      userId: session.userId,
      orderId: id,
      paymentMethod: normalizeString(formData.get("paymentMethod")),
      paymentNote: normalizeString(formData.get("paymentNote")),
      proofUrl: stored.url,
      proofName: file.name,
      proofMimeType: stored.mimeType,
      proofSize: stored.fileSize,
    });

    return NextResponse.json({
      ok: true,
      order,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "提交付款凭证失败",
      },
      {
        status: 400,
      },
    );
  }
}
