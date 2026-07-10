import { describe, expect, it } from "vitest";

import { APP_DIRECTORY, partitionApps } from "@/lib/app-directory";

describe("APP_DIRECTORY 数据完整性", () => {
  it("应用名称唯一", () => {
    const names = APP_DIRECTORY.map((app) => app.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("可用应用指向站内路由，即将上线应用 href 为 null", () => {
    for (const app of APP_DIRECTORY) {
      if (app.href === null) continue;
      expect(app.href.startsWith("/")).toBe(true);
    }
  });

  it("每个应用都有名称与描述", () => {
    for (const app of APP_DIRECTORY) {
      expect(app.name.trim()).toBeTruthy();
      expect(app.description.trim()).toBeTruthy();
    }
  });
});

describe("partitionApps", () => {
  it("按 href 是否为空拆分为可用/即将上线两组", () => {
    const { available, upcoming } = partitionApps();
    expect(available.every((app) => app.href !== null)).toBe(true);
    expect(upcoming.every((app) => app.href === null)).toBe(true);
    expect(available.length + upcoming.length).toBe(APP_DIRECTORY.length);
  });

  it("可用组非空且包含创作入口", () => {
    const { available } = partitionApps();
    expect(available.length).toBeGreaterThan(0);
    expect(available.some((app) => app.href === "/generate")).toBe(true);
  });
});
