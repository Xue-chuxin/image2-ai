import { NextResponse } from "next/server";

import { deleteUserByAdmin, updateUserByAdmin } from "@/lib/admin-users";
import { jsonError } from "@/lib/app-error";
import { getAdminSession } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  const { id } = await context.params;

  try {
    const user = await updateUserByAdmin({
      userId: id,
      email: (payload as { email?: unknown }).email,
      displayName: (payload as { displayName?: unknown }).displayName,
      role: (payload as { role?: unknown }).role,
      password: (payload as { password?: unknown }).password,
      adminUserId: session.userId,
    });

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (error) {
    return jsonError(error, "编辑用户失败。", 400);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const deleted = await deleteUserByAdmin({
      userId: id,
      adminUserId: session.userId,
    });

    return NextResponse.json({
      ok: true,
      deleted,
    });
  } catch (error) {
    return jsonError(error, "删除用户失败。", 400);
  }
}
