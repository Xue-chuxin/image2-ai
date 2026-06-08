import { HomeWorksShowcase } from "@/components/home-works-showcase";
import { categories, promptCards } from "@/lib/mock-data";

export default function PromptsPage() {
  return (
    <main className="space-y-6 pb-28">
      <HomeWorksShowcase
        categories={categories}
        initialWorks={[]}
        fallbackPrompts={promptCards}
        eyebrow="Prompt works"
        title="灵感展示"
        fallbackDescription="和首页作品展示保持同一套分类、卡片比例、瀑布流浏览和详情弹窗。"
        fallbackBadgeLabel="灵感"
        fallbackSourceLabel="灵感库"
        fallbackTypeLabel="提示词灵感"
        emptyTitle="没有找到匹配灵感"
        emptyDescription="换一个关键词，或切回“全部”分类。"
      />
    </main>
  );
}
