import path from "node:path";

import { defineConfig } from "vitest/config";

// 真实 Postgres 集成测试专用 config（与纯逻辑的 vitest.config.ts 互不干扰）。
// 仅当设置了 DATABASE_URL_TEST 时才真正跑 tests/db/**；否则 include 置空并提示，保证降级不报错。
const testDbUrl = process.env.DATABASE_URL_TEST;

if (!testDbUrl) {
  // eslint-disable-next-line no-console
  console.warn(
    "[test:db] 未设置 DATABASE_URL_TEST，跳过数据库集成测试。" +
      "首次使用请 `createdb image2_app_test` 并设置 DATABASE_URL_TEST 后重试。",
  );
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    // 缺测试库时 include 置空，`vitest run` 无用例也正常退出（不报错）。
    include: testDbUrl ? ["tests/db/**/*.test.ts"] : [],
    passWithNoTests: true,
    // 在 worker 内把 @/lib/db 的 PrismaClient 指向测试库，无需 mock、零源码改动。
    env: {
      DATABASE_URL: testDbUrl ?? "",
    },
    globalSetup: testDbUrl ? ["tests/db/global-setup.ts"] : [],
    setupFiles: testDbUrl ? ["tests/db/setup.ts"] : [],
    // 共享同一个测试库，串行跑避免文件间互相污染。
    fileParallelism: false,
  },
});
