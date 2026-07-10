import { describe, expect, it } from "vitest";

import {
  getUserCreditBalance,
  grantPurchasedCredits,
  refundReservedCreditsForJob,
  reserveCreditsForJob,
  spendReservedCreditsForJob,
} from "@/lib/credits";
import { AppError } from "@/lib/app-error";

import { createUserWithAccount, getAccount, listTransactions } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

describe.skipIf(!hasDb)("credits DB 集成", () => {
  describe("reserveCreditsForJob", () => {
    it("余额充足：available 减 / frozen 增，写 1 条 FREEZE 流水", async () => {
      const { user } = await createUserWithAccount({ available: 100, frozen: 0 });

      await reserveCreditsForJob(user.id, 35, "job-1");

      const account = await getAccount(user.id);
      expect(account?.available).toBe(65);
      expect(account?.frozen).toBe(35);

      const txs = await listTransactions(user.id);
      expect(txs).toHaveLength(1);
      expect(txs[0].type).toBe("FREEZE");
      expect(txs[0].amount).toBe(-35);
      expect(txs[0].balance).toBe(65);
      expect(txs[0].jobId).toBe("job-1");
    });

    it("余额不足：抛 INSUFFICIENT_CREDITS(402)，账户与流水不变", async () => {
      const { user } = await createUserWithAccount({ available: 10, frozen: 0 });

      await expect(reserveCreditsForJob(user.id, 35, "job-1")).rejects.toMatchObject({
        code: "INSUFFICIENT_CREDITS",
        status: 402,
      });
      await expect(reserveCreditsForJob(user.id, 35, "job-1")).rejects.toBeInstanceOf(AppError);

      const account = await getAccount(user.id);
      expect(account?.available).toBe(10);
      expect(account?.frozen).toBe(0);
      expect(await listTransactions(user.id)).toHaveLength(0);
    });

    it("amount<=0：无副作用直接返回", async () => {
      const { user } = await createUserWithAccount({ available: 50, frozen: 0 });

      await reserveCreditsForJob(user.id, 0, "job-1");
      await reserveCreditsForJob(user.id, -5, "job-1");

      const account = await getAccount(user.id);
      expect(account?.available).toBe(50);
      expect(account?.frozen).toBe(0);
      expect(await listTransactions(user.id)).toHaveLength(0);
    });
  });

  describe("spendReservedCreditsForJob", () => {
    it("frozen 充足：frozen 减，写 SPEND 流水", async () => {
      const { user } = await createUserWithAccount({ available: 65, frozen: 35 });

      await spendReservedCreditsForJob(user.id, 35, "job-1");

      const account = await getAccount(user.id);
      expect(account?.available).toBe(65);
      expect(account?.frozen).toBe(0);

      const spend = (await listTransactions(user.id)).filter((t) => t.type === "SPEND");
      expect(spend).toHaveLength(1);
      expect(spend[0].amount).toBe(-35);
      expect(spend[0].balance).toBe(65);
    });

    it("重复 spend（frozen 已不足）：幂等跳过，frozen 不变、不新增流水", async () => {
      const { user } = await createUserWithAccount({ available: 65, frozen: 35 });

      await spendReservedCreditsForJob(user.id, 35, "job-1");
      // 再次结算：frozen 已为 0，条件更新命中 0 行，幂等跳过。
      await spendReservedCreditsForJob(user.id, 35, "job-1");

      const account = await getAccount(user.id);
      expect(account?.available).toBe(65);
      expect(account?.frozen).toBe(0);
      expect((await listTransactions(user.id)).filter((t) => t.type === "SPEND")).toHaveLength(1);
    });

    it("amount<=0：无副作用", async () => {
      const { user } = await createUserWithAccount({ available: 65, frozen: 35 });

      await spendReservedCreditsForJob(user.id, 0, "job-1");

      const account = await getAccount(user.id);
      expect(account?.frozen).toBe(35);
      expect(await listTransactions(user.id)).toHaveLength(0);
    });
  });

  describe("refundReservedCreditsForJob", () => {
    it("frozen 充足：available 增 / frozen 减，写 REFUND 流水", async () => {
      const { user } = await createUserWithAccount({ available: 65, frozen: 35 });

      await refundReservedCreditsForJob(user.id, 35, "job-1");

      const account = await getAccount(user.id);
      expect(account?.available).toBe(100);
      expect(account?.frozen).toBe(0);

      const refund = (await listTransactions(user.id)).filter((t) => t.type === "REFUND");
      expect(refund).toHaveLength(1);
      expect(refund[0].amount).toBe(35);
      expect(refund[0].balance).toBe(100);
    });

    it("重复 refund：幂等跳过，不双倍返还", async () => {
      const { user } = await createUserWithAccount({ available: 65, frozen: 35 });

      await refundReservedCreditsForJob(user.id, 35, "job-1");
      await refundReservedCreditsForJob(user.id, 35, "job-1");

      const account = await getAccount(user.id);
      expect(account?.available).toBe(100);
      expect(account?.frozen).toBe(0);
      expect((await listTransactions(user.id)).filter((t) => t.type === "REFUND")).toHaveLength(1);
    });

    it("amount<=0：无副作用", async () => {
      const { user } = await createUserWithAccount({ available: 65, frozen: 35 });

      await refundReservedCreditsForJob(user.id, -1, "job-1");

      const account = await getAccount(user.id);
      expect(account?.available).toBe(65);
      expect(account?.frozen).toBe(35);
      expect(await listTransactions(user.id)).toHaveLength(0);
    });
  });

  describe("grantPurchasedCredits", () => {
    it("available 增，写 PURCHASE 流水", async () => {
      const { user } = await createUserWithAccount({ available: 10, frozen: 0 });

      await grantPurchasedCredits(user.id, 200, "order-1");

      const account = await getAccount(user.id);
      expect(account?.available).toBe(210);

      const purchase = (await listTransactions(user.id)).filter((t) => t.type === "PURCHASE");
      expect(purchase).toHaveLength(1);
      expect(purchase[0].amount).toBe(200);
      expect(purchase[0].balance).toBe(210);
      expect(purchase[0].orderId).toBe("order-1");
    });
  });

  describe("全链路一致性", () => {
    it("reserve→spend：余额账实与流水台账吻合", async () => {
      const { user } = await createUserWithAccount({ available: 100, frozen: 0 });

      await reserveCreditsForJob(user.id, 35, "job-1");
      await spendReservedCreditsForJob(user.id, 35, "job-1");

      const balance = await getUserCreditBalance(user.id);
      expect(balance.available).toBe(65);
      expect(balance.frozen).toBe(0);

      const txs = await listTransactions(user.id);
      expect(txs.map((t) => t.type)).toEqual(["FREEZE", "SPEND"]);
    });

    it("reserve→refund：回到初始余额、frozen 归零", async () => {
      const { user } = await createUserWithAccount({ available: 100, frozen: 0 });

      await reserveCreditsForJob(user.id, 35, "job-1");
      await refundReservedCreditsForJob(user.id, 35, "job-1");

      const balance = await getUserCreditBalance(user.id);
      expect(balance.available).toBe(100);
      expect(balance.frozen).toBe(0);

      const txs = await listTransactions(user.id);
      expect(txs.map((t) => t.type)).toEqual(["FREEZE", "REFUND"]);
    });
  });
});
