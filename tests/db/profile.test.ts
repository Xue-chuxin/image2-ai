import { describe, expect, it } from "vitest";

import { getUserProfile, updateDisplayName } from "@/lib/profile";

import { createUser } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

describe.skipIf(!hasDb)("profile DB 集成", () => {
  describe("getUserProfile", () => {
    it("返回邮箱/昵称/头像三字段", async () => {
      const user = await createUser({ email: "who@test.local" });

      const profile = await getUserProfile(user.id);
      expect(profile).toEqual({ email: "who@test.local", displayName: null, avatarUrl: null });
    });

    it("用户不存在抛 NOT_FOUND(404)", async () => {
      await expect(getUserProfile("nonexistent")).rejects.toMatchObject({
        code: "NOT_FOUND",
        status: 404,
      });
    });
  });

  describe("updateDisplayName", () => {
    it("写入 trim 后的昵称", async () => {
      const user = await createUser();

      const profile = await updateDisplayName(user.id, "  小明  ");
      expect(profile.displayName).toBe("小明");
    });

    it("空白输入清空昵称（回退邮箱前缀显示）", async () => {
      const user = await createUser();
      await updateDisplayName(user.id, "先设置");

      const profile = await updateDisplayName(user.id, "   ");
      expect(profile.displayName).toBeNull();
    });

    it("超长昵称抛 BAD_REQUEST(400) 且不落库", async () => {
      const user = await createUser();

      await expect(updateDisplayName(user.id, "x".repeat(25))).rejects.toMatchObject({
        code: "BAD_REQUEST",
        status: 400,
      });

      const profile = await getUserProfile(user.id);
      expect(profile.displayName).toBeNull();
    });
  });
});
