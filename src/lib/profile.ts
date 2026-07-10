import { AppError } from "@/lib/app-error";
import { prisma } from "@/lib/db";
import { saveReferenceImage } from "@/lib/storage";
import { detectReferenceImageMimeType } from "@/lib/uploads";

export const DISPLAY_NAME_MAX_LENGTH = 24;
export const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

export type UserProfileView = {
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

function toProfileView(user: { email: string | null; displayName: string | null; avatarUrl: string | null }): UserProfileView {
  return {
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

/** 读取当前用户资料（邮箱/昵称/头像），用户不存在抛 NOT_FOUND(404)。 */
export async function getUserProfile(userId: string): Promise<UserProfileView> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, displayName: true, avatarUrl: true },
  });

  if (!user) {
    throw new AppError("NOT_FOUND", "用户不存在。", 404);
  }

  return toProfileView(user);
}

/**
 * 更新昵称：trim 后为空则清空昵称（回退到邮箱前缀显示），超长抛 BAD_REQUEST(400)。
 */
export async function updateDisplayName(userId: string, rawName: string | null | undefined): Promise<UserProfileView> {
  const trimmed = (rawName ?? "").trim();
  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new AppError("BAD_REQUEST", `昵称不能超过 ${DISPLAY_NAME_MAX_LENGTH} 个字符。`, 400);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { displayName: trimmed || null },
    select: { email: true, displayName: true, avatarUrl: true },
  });

  return toProfileView(user);
}

/**
 * 更新头像：以文件真实内容识别 MIME（拒伪造 Content-Type），复用 reference 公共存储桶，
 * 写入用户 avatarUrl（优先缩略图）。空文件/超限/非图片抛 BAD_REQUEST(400)。
 */
export async function updateUserAvatar(userId: string, buffer: Buffer): Promise<UserProfileView> {
  if (buffer.byteLength <= 0) {
    throw new AppError("BAD_REQUEST", "头像文件为空。", 400);
  }

  if (buffer.byteLength > MAX_AVATAR_BYTES) {
    throw new AppError("BAD_REQUEST", "头像不能超过 4MB。", 400);
  }

  let mimeType: string;
  try {
    mimeType = await detectReferenceImageMimeType(buffer);
  } catch (error) {
    throw new AppError("BAD_REQUEST", error instanceof Error ? error.message : "只支持 PNG、JPG、WEBP 图片。", 400);
  }

  const stored = await saveReferenceImage(userId, buffer, mimeType);
  const avatarUrl = stored.thumbnailUrl || stored.url;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: { email: true, displayName: true, avatarUrl: true },
  });

  return toProfileView(user);
}
