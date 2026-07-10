import Link from "next/link";
import { Heart, MessageCircle, Trophy, UserRound } from "lucide-react";

import {
  listTopCreators,
  listTopGalleryWorks,
  type LeaderboardCreator,
  type LeaderboardWork,
} from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

function rankBadgeClass(rank: number) {
  if (rank === 1) {
    return "bg-amber-400 text-white";
  }
  if (rank === 2) {
    return "bg-slate-300 text-white dark:bg-slate-400";
  }
  if (rank === 3) {
    return "bg-orange-300 text-white dark:bg-orange-400";
  }
  return "bg-page text-ink-secondary";
}

export default async function LeaderboardPage() {
  let works: LeaderboardWork[] = [];
  let creators: LeaderboardCreator[] = [];

  try {
    [works, creators] = await Promise.all([listTopGalleryWorks({ limit: 12 }), listTopCreators({ limit: 10 })]);
  } catch {
    // 数据库暂不可用时渲染空态。
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6">
      <section className="space-y-1">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-500">
          <Trophy className="h-3.5 w-3.5" />
          热度榜
        </p>
        <h1 className="text-xl font-bold text-ink">作品与创作者排行榜</h1>
        <p className="text-sm leading-6 text-ink-secondary">根据画廊广场的点赞与评论热度实时排名，发现最受欢迎的作品与最活跃的创作者。</p>
      </section>

      <section aria-label="热门作品榜" className="space-y-3">
        <h2 className="text-base font-bold text-ink">热门作品 Top 12</h2>
        {works.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {works.map((work) => (
              <Link
                key={work.imageId}
                href="/"
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-card transition hover:shadow-pop"
              >
                <div className="relative aspect-square overflow-hidden bg-page">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={work.thumbnailUrl}
                    alt={work.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <span
                    className={`absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-extrabold shadow-chip ${rankBadgeClass(work.rank)}`}
                  >
                    {work.rank}
                  </span>
                </div>
                <div className="min-w-0 space-y-1.5 p-3">
                  <p className="truncate text-sm font-bold text-ink">{work.title}</p>
                  <p className="truncate text-xs text-ink-faint">{work.authorName}</p>
                  <div className="flex items-center gap-3 text-xs text-ink-secondary">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-rose-400" />
                      {work.likes}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5 text-brand-400" />
                      {work.comments}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-panel/60 px-6 py-12 text-center">
            <Trophy className="mx-auto h-8 w-8 text-ink-faint" />
            <p className="mt-3 text-sm text-ink-secondary">还没有作品获得点赞，去画廊广场点赞喜欢的作品吧。</p>
          </div>
        )}
      </section>

      <section aria-label="活跃创作者榜" className="space-y-3">
        <h2 className="text-base font-bold text-ink">活跃创作者 Top 10</h2>
        {creators.length ? (
          <ul className="overflow-hidden rounded-2xl border border-line bg-panel shadow-card">
            {creators.map((creator) => (
              <li key={creator.userId} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${rankBadgeClass(creator.rank)}`}>
                  {creator.rank}
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-brand-500">
                  {creator.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={creator.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{creator.name}</p>
                  <p className="text-xs text-ink-faint">{creator.works} 件上榜作品</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-sm font-bold text-rose-500 dark:bg-rose-500/10 dark:text-rose-300">
                  <Heart className="h-3.5 w-3.5 fill-current" />
                  {creator.totalLikes}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-panel/60 px-6 py-12 text-center">
            <UserRound className="mx-auto h-8 w-8 text-ink-faint" />
            <p className="mt-3 text-sm text-ink-secondary">暂无上榜创作者，公开你的作品并收获点赞即可登榜。</p>
          </div>
        )}
      </section>
    </main>
  );
}
