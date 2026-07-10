import type { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { invalidateSettingsCache } from "@/lib/settings";

let seq = 0;

/** 建一个用户（默认普通用户），可指定邮箱/角色/邀请码。 */
export async function createUser(options?: {
  email?: string;
  role?: UserRole;
  referralCode?: string;
  referredById?: string;
}) {
  seq += 1;
  return prisma.user.create({
    data: {
      email: options?.email ?? `user${seq}-${Date.now()}@test.local`,
      role: options?.role ?? "USER",
      referralCode: options?.referralCode ?? null,
      referredById: options?.referredById ?? null,
    },
  });
}

/** 建用户并附带积分账户，初始化 available/frozen。 */
export async function createUserWithAccount(options?: {
  available?: number;
  frozen?: number;
  role?: UserRole;
  email?: string;
}) {
  const user = await createUser({ role: options?.role, email: options?.email });
  const account = await prisma.creditAccount.create({
    data: {
      userId: user.id,
      available: options?.available ?? 0,
      frozen: options?.frozen ?? 0,
    },
  });
  return { user, account };
}

/** 建一张运营精选画廊作品（默认可见），供点赞/评论与精选列表集成测试作为目标。 */
export async function createCuratedImage(options?: {
  title?: string;
  category?: string;
  sortOrder?: number;
  isActive?: boolean;
  isDeleted?: boolean;
  takenDownAt?: Date | null;
}) {
  seq += 1;
  return prisma.curatedGalleryImage.create({
    data: {
      title: options?.title ?? `精选作品 ${seq}`,
      summary: "测试用精选作品",
      imageUrl: `https://example.local/img-${seq}.png`,
      promptZh: "测试提示词",
      category: options?.category ?? "其他",
      sortOrder: options?.sortOrder ?? 0,
      isActive: options?.isActive ?? true,
      isDeleted: options?.isDeleted ?? false,
      takenDownAt: options?.takenDownAt ?? null,
      publishedAt: new Date(),
    },
  });
}

/** 建一个提示词分类，返回记录（含 slug）。 */
export async function createPromptCategory(options?: { name?: string; slug?: string; sortOrder?: number }) {
  seq += 1;
  return prisma.promptCategory.create({
    data: {
      name: options?.name ?? `分类 ${seq}`,
      slug: options?.slug ?? `cat-${seq}-${Date.now()}`,
      sortOrder: options?.sortOrder ?? 0,
    },
  });
}

/** 建一个提示词模板，可指定分类/标题/摘要/标签，供收藏与列表测试使用。 */
export async function createPrompt(options?: {
  title?: string;
  summary?: string;
  categoryId?: string;
  tags?: string[];
  weight?: number;
  viewCount?: number;
  favoriteCount?: number;
}) {
  seq += 1;
  return prisma.prompt.create({
    data: {
      title: options?.title ?? `模板 ${seq}`,
      slug: `prompt-${seq}-${Date.now()}`,
      summary: options?.summary ?? "测试用提示词模板",
      promptZh: "测试中文提示词",
      promptEn: "test english prompt",
      negativePrompt: null,
      categoryId: options?.categoryId ?? null,
      weight: options?.weight ?? 0,
      viewCount: options?.viewCount ?? 0,
      favoriteCount: options?.favoriteCount ?? 0,
      ...(options?.tags && options.tags.length
        ? { tags: { create: options.tags.map((name) => ({ name })) } }
        : {}),
    },
  });
}

/** 建一个生成任务 + 一张输出图，返回 { job, image }，供二创/发布等测试使用。 */
export async function createGeneratedImage(options?: {
  userId?: string;
  isPublic?: boolean;
  isDeleted?: boolean;
  takenDownAt?: Date | null;
  url?: string;
}) {
  seq += 1;
  const userId = options?.userId ?? (await createUser()).id;
  const job = await prisma.generationJob.create({
    data: {
      userId,
      status: "COMPLETED",
      originalInput: "测试任务",
    },
  });
  const image = await prisma.generatedImage.create({
    data: {
      jobId: job.id,
      url: options?.url ?? `https://example.local/gen-${seq}.png`,
      isPublic: options?.isPublic ?? false,
      isDeleted: options?.isDeleted ?? false,
      takenDownAt: options?.takenDownAt ?? null,
    },
  });
  return { job, image };
}

/** 建一个风格预设，可指定启用状态/排序/后缀，供风格预设列表测试使用。 */
export async function createStylePreset(options?: {
  name?: string;
  slug?: string;
  promptSuffix?: string;
  negativeSuffix?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}) {
  seq += 1;
  return prisma.stylePreset.create({
    data: {
      name: options?.name ?? `风格 ${seq}`,
      slug: options?.slug ?? `style-${seq}-${Date.now()}`,
      promptSuffix: options?.promptSuffix ?? "测试风格后缀",
      negativeSuffix: options?.negativeSuffix ?? null,
      sortOrder: options?.sortOrder ?? 0,
      isActive: options?.isActive ?? true,
    },
  });
}

/** 读取账户当前 available/frozen（不存在返回 null）。 */
export async function getAccount(userId: string) {
  return prisma.creditAccount.findUnique({ where: { userId } });
}

/** 读取某用户的流水（升序），便于断言台账。 */
export async function listTransactions(userId: string) {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

/** 批量写入 AppSetting 配置项并清缓存，供审核/邀请等运行时 config 读取。 */
export async function seedSettings(entries: Record<string, string>) {
  for (const [key, value] of Object.entries(entries)) {
    await prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  invalidateSettingsCache();
}
