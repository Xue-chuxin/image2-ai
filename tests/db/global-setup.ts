import { execSync } from "node:child_process";

// 集成测试启动前，把最新 schema 应用到测试库（幂等，已迁移则无操作）。
// 仅在设置了 DATABASE_URL_TEST 时运行；config 已保证缺库时不会加载本文件。
export default function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    return;
  }

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
