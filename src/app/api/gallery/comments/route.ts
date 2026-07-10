import { NextResponse } from "next/server";

import { getAppErrorMessage, getAppErrorStatus } from "@/lib/app-error";
import { getUserSession } from "@/lib/auth";
import { addComment, deleteOwnComment, listComments } from "@/lib/gallery-social";

// 评论列表公开可读；发布/删除需登录。
export async function GET(request: Request) {
  try {
    const session = await getUserSession();
    const { searchParams } = new URL(request.url);
    const comments = await listComments(
      searchParams.get("sourceType"),
      searchParams.get("imageId"),
      { currentUserId: session?.userId ?? null },
    );
    return NextResponse.json({ ok: true, comments });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getAppErrorMessage(error, "获取评论失败") },
      { status: getAppErrorStatus(error, 400) },
    );
  }
}

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再评论。" }, { status: 401 });
  }

  try {
    const payload = (await request.json().catch(() => null)) as
      | { sourceType?: unknown; imageId?: unknown; content?: unknown }
      | null;
    const comment = await addComment(
      session.userId,
      payload?.sourceType,
      payload?.imageId,
      payload?.content,
    );
    return NextResponse.json({ ok: true, comment });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getAppErrorMessage(error, "评论失败") },
      { status: getAppErrorStatus(error, 400) },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再操作。" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    await deleteOwnComment(session.userId, searchParams.get("id"));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getAppErrorMessage(error, "删除评论失败") },
      { status: getAppErrorStatus(error, 400) },
    );
  }
}
