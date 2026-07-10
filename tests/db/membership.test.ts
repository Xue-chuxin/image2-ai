import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { getUserSubscription } from "@/lib/billing";

import { createUser } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

const DAY_MS = 24 * 60 * 60 * 1000;

describe.skipIf(!hasDb)("membership 订阅视图 DB 集成", () => {
  it("无订阅时返回 null", async () => {
    const user = await createUser();
    expect(await getUserSubscription(user.id)).toBeNull();
  });

  it("未到期订阅：active=true，daysRemaining 向上取整", async () => {
    const user = await createUser();
    await prisma.subscription.create({
      data: {
        userId: user.id,
        packageName: "月度会员",
        expiresAt: new Date(Date.now() + 5 * DAY_MS + 1000),
      },
    });

    const sub = await getUserSubscription(user.id);
    expect(sub).toMatchObject({ packageName: "月度会员", active: true });
    expect(sub?.daysRemaining).toBe(6);
  });

  it("已到期订阅：active=false，daysRemaining=0", async () => {
    const user = await createUser();
    await prisma.subscription.create({
      data: {
        userId: user.id,
        packageName: "月度会员",
        expiresAt: new Date(Date.now() - DAY_MS),
      },
    });

    const sub = await getUserSubscription(user.id);
    expect(sub).toMatchObject({ active: false, daysRemaining: 0 });
  });
});
