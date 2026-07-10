import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { getOrCreateReferralCode, grantReferralRewardsInTx, resolveReferrerByCode } from "@/lib/invite";

import { createUser, createUserWithAccount, listTransactions } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

describe.skipIf(!hasDb)("invite DB 集成", () => {
  describe("resolveReferrerByCode", () => {
    it("有效 USER 邀请码：返回用户 id", async () => {
      const user = await createUser({ referralCode: "ABC12345" });
      expect(await resolveReferrerByCode("ABC12345")).toBe(user.id);
    });

    it("小写/带空格输入经 trim+大写归一后命中", async () => {
      const user = await createUser({ referralCode: "ABC12345" });
      expect(await resolveReferrerByCode("  abc12345 ")).toBe(user.id);
    });

    it("ADMIN 角色邀请码：返回 null", async () => {
      await createUser({ referralCode: "ADMIN123", role: "ADMIN" });
      expect(await resolveReferrerByCode("ADMIN123")).toBeNull();
    });

    it("不存在的邀请码：返回 null", async () => {
      expect(await resolveReferrerByCode("NOSUCH00")).toBeNull();
    });

    it("空/null 输入：返回 null", async () => {
      expect(await resolveReferrerByCode("")).toBeNull();
      expect(await resolveReferrerByCode(null)).toBeNull();
      expect(await resolveReferrerByCode(undefined)).toBeNull();
    });
  });

  describe("getOrCreateReferralCode", () => {
    it("首次生成并写库", async () => {
      const user = await createUser();
      const code = await getOrCreateReferralCode(user.id);
      expect(code).toMatch(/^[A-Z0-9]{8}$/);

      const persisted = await prisma.user.findUnique({ where: { id: user.id }, select: { referralCode: true } });
      expect(persisted?.referralCode).toBe(code);
    });

    it("再次调用幂等返回同一码", async () => {
      const user = await createUser();
      const first = await getOrCreateReferralCode(user.id);
      const second = await getOrCreateReferralCode(user.id);
      expect(second).toBe(first);
    });
  });

  describe("grantReferralRewardsInTx", () => {
    it("邀请人/被邀请人各加分 + 各 1 条 GRANT 流水", async () => {
      const { user: invitee } = await createUserWithAccount({ available: 5, frozen: 0 });
      const { user: inviter } = await createUserWithAccount({ available: 100, frozen: 0 });

      await prisma.$transaction((tx) =>
        grantReferralRewardsInTx(tx, {
          inviteeUserId: invitee.id,
          referrerUserId: inviter.id,
          inviterCredits: 30,
          inviteeCredits: 20,
        }),
      );

      const inviteeAccount = await prisma.creditAccount.findUnique({ where: { userId: invitee.id } });
      const inviterAccount = await prisma.creditAccount.findUnique({ where: { userId: inviter.id } });
      expect(inviteeAccount?.available).toBe(25);
      expect(inviterAccount?.available).toBe(130);

      const inviteeTxs = (await listTransactions(invitee.id)).filter((t) => t.type === "GRANT");
      const inviterTxs = (await listTransactions(inviter.id)).filter((t) => t.type === "GRANT");
      expect(inviteeTxs).toHaveLength(1);
      expect(inviteeTxs[0].amount).toBe(20);
      expect(inviteeTxs[0].balance).toBe(25);
      expect(inviterTxs).toHaveLength(1);
      expect(inviterTxs[0].amount).toBe(30);
      expect(inviterTxs[0].balance).toBe(130);
    });

    it("credits=0 时对应方不加分不写流水", async () => {
      const { user: invitee } = await createUserWithAccount({ available: 5, frozen: 0 });
      const { user: inviter } = await createUserWithAccount({ available: 100, frozen: 0 });

      await prisma.$transaction((tx) =>
        grantReferralRewardsInTx(tx, {
          inviteeUserId: invitee.id,
          referrerUserId: inviter.id,
          inviterCredits: 0,
          inviteeCredits: 0,
        }),
      );

      const inviteeAccount = await prisma.creditAccount.findUnique({ where: { userId: invitee.id } });
      const inviterAccount = await prisma.creditAccount.findUnique({ where: { userId: inviter.id } });
      expect(inviteeAccount?.available).toBe(5);
      expect(inviterAccount?.available).toBe(100);
      expect(await listTransactions(invitee.id)).toHaveLength(0);
      expect(await listTransactions(inviter.id)).toHaveLength(0);
    });
  });
});
