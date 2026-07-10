import { PromptLibrary } from "@/components/prompt-library";
import { getUserSession } from "@/lib/auth";
import { listPromptCategories, listPrompts, listUserPromptFavoriteIds, type PromptCardView, type PromptCategoryView } from "@/lib/prompts";

export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  const session = await getUserSession();

  let prompts: PromptCardView[] = [];
  let categories: PromptCategoryView[] = [];
  let favoriteIds: string[] = [];

  try {
    [prompts, categories, favoriteIds] = await Promise.all([
      listPrompts({ limit: 120 }),
      listPromptCategories(),
      session ? listUserPromptFavoriteIds(session.userId) : Promise.resolve<string[]>([]),
    ]);
  } catch {
    // 数据库暂不可用时渲染空态。
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6">
      <section className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">灵感</p>
        <h1 className="text-xl font-bold text-ink">提示词模板库</h1>
        <p className="text-sm leading-6 text-ink-secondary">精选可直接套用的提示词模板，一键带入创作页，收藏喜欢的模板方便下次复用。</p>
      </section>
      <PromptLibrary prompts={prompts} categories={categories} initialFavoriteIds={favoriteIds} isLoggedIn={Boolean(session)} />
    </main>
  );
}
