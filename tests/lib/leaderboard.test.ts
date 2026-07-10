import { describe, expect, it } from "vitest";

import { aggregateCreators, type CreatorLikeEntry } from "@/lib/leaderboard";

describe("aggregateCreators", () => {
  it("按作者累加点赞与作品数，按总赞降序赋名次", () => {
    const entries: CreatorLikeEntry[] = [
      { userId: "a", name: "Alice", avatarUrl: null, likes: 3 },
      { userId: "b", name: "Bob", avatarUrl: null, likes: 10 },
      { userId: "a", name: "Alice", avatarUrl: null, likes: 4 },
    ];

    const result = aggregateCreators(entries, 10);
    // a 合计 7、b 合计 10 → 按总赞降序 b 在前，a 的两条被合并为 works=2
    expect(result).toEqual([
      { rank: 1, userId: "b", name: "Bob", avatarUrl: null, totalLikes: 10, works: 1 },
      { rank: 2, userId: "a", name: "Alice", avatarUrl: null, totalLikes: 7, works: 2 },
    ]);
  });

  it("总赞相同则作品数多者靠前", () => {
    const entries: CreatorLikeEntry[] = [
      { userId: "a", name: "A", avatarUrl: null, likes: 6 },
      { userId: "b", name: "B", avatarUrl: null, likes: 3 },
      { userId: "b", name: "B", avatarUrl: null, likes: 3 },
    ];
    const result = aggregateCreators(entries, 10);
    expect(result.map((c) => c.userId)).toEqual(["b", "a"]);
    expect(result[0].works).toBe(2);
  });

  it("limit 生效并夹到 [1,100]，空输入返回空", () => {
    const entries: CreatorLikeEntry[] = [
      { userId: "a", name: "A", avatarUrl: null, likes: 5 },
      { userId: "b", name: "B", avatarUrl: null, likes: 4 },
      { userId: "c", name: "C", avatarUrl: null, likes: 3 },
    ];
    expect(aggregateCreators(entries, 2)).toHaveLength(2);
    expect(aggregateCreators([], 10)).toEqual([]);
  });
});
