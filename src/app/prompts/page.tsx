import { HomeWorksShowcase } from "@/components/home-works-showcase";
import { listPublicGalleryImages } from "@/lib/gallery";
import { categories, promptCards } from "@/lib/mock-data";

export default async function PromptsPage() {
  let galleryError: string | null = null;

  try {
    await listPublicGalleryImages({ limit: 1 });
  } catch {
    galleryError = "作品库暂时不可用，请检查数据库服务。";
  }

  return (
    <main className="space-y-6 pb-28">
      <HomeWorksShowcase
        categories={categories}
        initialWorks={[]}
        fallbackPrompts={promptCards}
        galleryError={galleryError}
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
