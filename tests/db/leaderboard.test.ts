import { describe, expect, it } from "vitest";

import { toggleLike } from "@/lib/gallery-social";
import { listTopCreators, listTopGalleryWorks } from "@/lib/leaderboard";

import { createGeneratedImage, createUser } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

async function likeBy(userIds: string[], imageId: string) {
  for (const userId of userIds) {
    await toggleLike(userId, "generated", imageId);
  }
}

describe.skipIf(!hasDb)("leaderboard DB 集成", () => {
  describe("listTopGalleryWorks", () => {
    it("按点赞数降序排名，无赞作品不上榜", async () => {
      const [author, v1, v2, v3] = await Promise.all([createUser(), createUser(), createUser(), createUser()]);
      const hot = await createGeneratedImage({ userId: author.id, isPublic: true });
      const mild = await createGeneratedImage({ userId: author.id, isPublic: true });
      await createGeneratedImage({ userId: author.id, isPublic: true }); // 无赞

      await likeBy([v1.id, v2.id, v3.id], hot.image.id);
      await likeBy([v1.id], mild.image.id);

      const works = await listTopGalleryWorks();
      expect(works.map((w) => w.imageId)).toEqual([hot.image.id, mild.image.id]);
      expect(works[0]).toMatchObject({ rank: 1, likes: 3 });
      expect(works[1]).toMatchObject({ rank: 2, likes: 1 });
    });

    it("非公开作品即使有赞也不上榜", async () => {
      const [author, viewer] = await Promise.all([createUser(), createUser()]);
      const publicWork = await createGeneratedImage({ userId: author.id, isPublic: true });
      await likeBy([viewer.id], publicWork.image.id);

      const works = await listTopGalleryWorks();
      // 仅公开作品在榜（私有作品无法点赞，故天然不会出现）
      expect(works.map((w) => w.imageId)).toEqual([publicWork.image.id]);
    });
  });

  describe("listTopCreators", () => {
    it("按创作者总赞聚合排序，含各自上榜作品数", async () => {
      const [alice, bob, v1, v2, v3] = await Promise.all([
        createUser(),
        createUser(),
        createUser(),
        createUser(),
        createUser(),
      ]);
      const aliceHot = await createGeneratedImage({ userId: alice.id, isPublic: true });
      const aliceMild = await createGeneratedImage({ userId: alice.id, isPublic: true });
      const bobWork = await createGeneratedImage({ userId: bob.id, isPublic: true });

      await likeBy([v1.id, v2.id], aliceHot.image.id); // alice +2
      await likeBy([v3.id], aliceMild.image.id); // alice +1（共 3、2 件作品）
      await likeBy([v1.id, v2.id, v3.id], bobWork.image.id); // bob +3（1 件作品）

      const creators = await listTopCreators();
      // 总赞相同（各 3）时作品数多者靠前 → alice(2 件) 在 bob(1 件) 之前
      expect(creators.map((c) => c.userId)).toEqual([alice.id, bob.id]);
      expect(creators[0]).toMatchObject({ rank: 1, totalLikes: 3, works: 2 });
      expect(creators[1]).toMatchObject({ rank: 2, totalLikes: 3, works: 1 });
    });
  });
});
