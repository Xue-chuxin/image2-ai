import { HomeWorksShowcase } from "@/components/home-works-showcase";
import { BlurText, SpotlightCard } from "@/components/front/react-bits";
import { listPublicGalleryImages, type GalleryImageView } from "@/lib/gallery";
import { categories, promptCards } from "@/lib/mock-data";
import { getPublicAppSettings } from "@/lib/settings";

export default async function PromptsPage() {
  const settings = await getPublicAppSettings();
  let publicWorks: GalleryImageView[] = [];
  let galleryError: string | null = null;

  try {
    publicWorks = await listPublicGalleryImages({ limit: 48 });
  } catch {
    galleryError = "作品库暂时不可用，请检查数据库服务。";
  }

  if (settings.frontTemplate === "tdesign_workspace") {
    return (
      <main className="front-td-page-stack">
        <HomeWorksShowcase
          categories={categories}
          initialWorks={publicWorks}
          fallbackPrompts={promptCards}
          galleryError={galleryError}
          eyebrow="灵感作品"
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

  return (
    <main className="space-y-6 pb-28">
      <SpotlightCard className="p-5">
        <p className="text-xs font-black tracking-[0.24em] text-slate-400">灵感库</p>
        <BlurText as="h1" text="灵感展示" className="mt-2 text-3xl font-black text-slate-950" delay={0.035} />
        <p className="mt-2 text-sm leading-6 text-slate-500">从公开作品和运营精选中挑选方向，一键带入创作台继续生成。</p>
      </SpotlightCard>
      <HomeWorksShowcase
        categories={categories}
        initialWorks={publicWorks}
        fallbackPrompts={promptCards}
        galleryError={galleryError}
        eyebrow="灵感作品"
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
