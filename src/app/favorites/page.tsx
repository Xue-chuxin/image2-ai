import Link from "next/link";
import { Heart, LockKeyhole } from "lucide-react";

import { HomeWorksShowcase } from "@/components/home-works-showcase";
import { getUserSession } from "@/lib/auth";
import { listUserFavoriteImages } from "@/lib/favorites";
import { GALLERY_CATEGORIES, type GalleryImageView } from "@/lib/gallery";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await getUserSession();

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-[1200px] space-y-5">
        <div className="flex justify-center py-10 md:py-16">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <LockKeyhole className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-lg font-bold text-ink">请先登录</h1>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              收藏按账号隔离，登录后可以在画廊广场收藏喜欢的作品，并在这里集中查看。
            </p>
            <Link
              href="/signin?next=/favorites"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
            >
              去登录
            </Link>
          </div>
        </div>
      </main>
    );
  }

  let favorites: GalleryImageView[] = [];

  try {
    favorites = await listUserFavoriteImages(session.userId, { limit: 60 });
  } catch {
    favorites = [];
  }

  if (favorites.length === 0) {
    return (
      <main className="mx-auto w-full max-w-[1200px] space-y-5">
        <div className="flex justify-center py-10 md:py-16">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
              <Heart className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-lg font-bold text-ink">还没有收藏</h1>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              在画廊广场点击作品右上角的心形即可收藏，收藏的作品会集中显示在这里。
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
            >
              去逛画廊
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] space-y-5">
      <section className="space-y-4" aria-label="我的收藏">
        <HomeWorksShowcase
          categories={GALLERY_CATEGORIES}
          initialWorks={favorites}
          fallbackPrompts={[]}
          eyebrow="收藏"
          title="我的收藏"
          realDescription="你收藏的公开作品与运营精选，取消收藏后会从这里移除。"
          enableRemoteSearch={false}
          favoritesView
          emptyTitle="没有找到匹配收藏"
          emptyDescription="换一个关键词，或切回“全部”分类。"
        />
      </section>
    </main>
  );
}
