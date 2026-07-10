import Link from "next/link";
import { Flame, Heart, Wand2 } from "lucide-react";

import type { PromptCardView } from "@/lib/prompts";

function buildGenerateHref(prompt: PromptCardView) {
  const params = new URLSearchParams();
  if (prompt.promptZh) params.set("prompt", prompt.promptZh);
  if (prompt.promptEn) params.set("promptEn", prompt.promptEn);
  if (prompt.negativePrompt) params.set("negativePrompt", prompt.negativePrompt);
  return `/generate?${params.toString()}`;
}

function rankBadgeClass(index: number) {
  if (index === 0) return "bg-amber-400 text-white";
  if (index === 1) return "bg-slate-300 text-white dark:bg-slate-400";
  if (index === 2) return "bg-orange-300 text-white";
  return "bg-page text-ink-faint";
}

/** 提示词热门榜：按收藏/浏览排序展示前若干条，带名次徽章与一键去创作。 */
export function PromptTrendingBoard({ prompts }: { prompts: PromptCardView[] }) {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <section aria-label="热门榜" className="rounded-2xl border border-line bg-panel p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-300">
          <Flame className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-bold text-ink">热门提示词榜</h2>
          <p className="text-xs text-ink-faint">按收藏与浏览热度排序，发现大家都在用的模板。</p>
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {prompts.map((prompt, index) => (
          <li
            key={prompt.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-page/40 px-3 py-2.5"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${rankBadgeClass(index)}`}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{prompt.title}</p>
              <p className="mt-0.5 flex items-center gap-3 text-[11px] text-ink-faint">
                {prompt.categoryName ? <span className="text-brand-500">{prompt.categoryName}</span> : null}
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {prompt.favoriteCount}
                </span>
                <span>浏览 {prompt.viewCount}</span>
              </p>
            </div>
            <Link
              href={buildGenerateHref(prompt)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-chip transition hover:bg-brand-600"
            >
              <Wand2 className="h-3 w-3" />
              去创作
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
