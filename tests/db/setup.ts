import { beforeEach } from "vitest";

import { prisma } from "@/lib/db";
import { invalidateSettingsCache } from "@/lib/settings";

// 每个用例前清空测试库相关表（CASCADE 处理外键），保证用例间零污染。
// 注意：不 mock @/lib/db —— 集成测试要连真实 Postgres。
const TABLES = [
  "CreditTransaction",
  "CreditAccount",
  "ModerationLog",
  "GalleryImageLike",
  "GalleryImageComment",
  "CuratedGalleryImage",
  "Notification",
  "AppSetting",
  "User",
];

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
  // 清空 30s 设置缓存，避免上一个用例 seed 的 AppSetting 残留影响下一个用例。
  invalidateSettingsCache();
});
