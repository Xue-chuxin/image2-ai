import Link from "next/link";
import { ArrowRight, Sparkles, Star } from "lucide-react";

import { GALLERY_CATEGORIES, listCuratedGalleryImages, type GalleryImageView } from "@/lib/gallery";

export const dynamic = "force-dynamic";

function firstValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
}

function buildGenerateHref(image: GalleryImageView) {
  const params = new URLSearchParams();
  if (image.promptZh) {
    params.set("prompt", image.promptZh);
  }
  if (image.promptEn) {
    params.set("promptEn", image.promptEn);
  }
  if (image.negativePrompt) {
    params.set("negativePrompt", image.negativePrompt);
  }
  if (image.ratio) {
    params.set("ratio", image.ratio);
  }
  const query = params.toString();
  return query ? `/generate?${query}` : "/generate";
}

export default async function CuratedGalleryPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string | string[] }>;
}) {
  const resolved = searchParams ? await searchParams : {};
  const rawCategory = firstValue(resolved.category);
  const activeCategory = (GALLERY_CATEGORIES as readonly string[]).includes(rawCategory) ? rawCategory : "全部";

  let images: GalleryImageView[] = [];
  let loadError = false;
  try {
    images = await listCuratedGalleryImages({ category: activeCategory, limit: 60 });
  } catch {
    loadError = true;
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] space-y-5">
      <section className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-amber-400/90 via-orange-400/90 to-rose-400/90 px-6 py-8 text-white shadow-card">
        <div className="flex items-center gap-2">
          <Star size={20} className="fill-white" />
          <span className="text-xs font-semibold uppercase tracking-wide text-white/85">Curated</span>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">官方精选</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/90">由运营团队精心挑选的高质量作品，附带可直接复用的提示词，一键带入创作页出你自己的同款。</p>
      </section>

      {/* 分类筛选 */}
      <nav aria-label="精选分类" className="flex flex-wrap gap-2">
        {GALLERY_CATEGORIES.map((category) => {
          const active = category === activeCategory;
          const href = category === "全部" ? "/curated" : `/curated?category=${encodeURIComponent(category)}`;
          return (
            <Link
              key={category}
              href={href}
              className={
                active
                  ? "rounded-lg border border-brand-500 bg-brand-500 px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-chip"
                  : "rounded-lg border border-line bg-panel px-3.5 py-1.5 text-[13px] font-semibold text-ink-secondary transition hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-600"
              }
            >
              {category}
            </Link>
          );
        })}
      </nav>

      {loadError ? (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center text-sm text-ink-secondary shadow-card">精选作品暂时不可用，请检查数据库服务。</div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-panel p-14 text-center shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <Sparkles size={22} />
          </span>
          <p className="text-sm font-semibold text-ink-secondary">该分类下还没有精选作品</p>
          <p className="text-xs text-ink-faint">运营正在持续上新，先去别的分类逛逛吧。</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {images.map((image) => (
            <article key={image.id} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-pop">
              <div className="relative aspect-square overflow-hidden bg-page">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.thumbnailUrl || image.url} alt={image.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute left-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">{image.category}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3.5">
                <h2 className="truncate text-sm font-bold text-ink">{image.title}</h2>
                <p className="line-clamp-2 text-xs leading-5 text-ink-faint">{image.summary}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="truncate text-[11px] text-ink-faint">{image.authorName}</span>
                  <Link
                    href={buildGenerateHref(image)}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-bold text-white shadow-chip transition hover:bg-brand-600"
                  >
                    去创作
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
