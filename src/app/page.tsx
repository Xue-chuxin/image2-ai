import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { GenerateComposer } from "@/components/generate-composer";
import { AnimatedContent, BlurText, FloatingActionBeam, GlassSurface, SpotlightCard, SplitText } from "@/components/front/react-bits";
import { HomeWorksShowcase } from "@/components/home-works-showcase";
import { GALLERY_CATEGORIES, listPublicGalleryImages, type GalleryImageView } from "@/lib/gallery";
import { promptCards } from "@/lib/mock-data";

const steps = [
  ["01", "写清画面", "先把主体、场景、镜头和比例写清楚。页面会保留你的原意，不把描述改成模板话术。"],
  ["02", "选择方向", "从写真、商品、角色、界面、建筑、插画、国风和其他里选择方向，也可以先用润色功能整理文字。"],
  ["03", "生成并归档", "提交任务后到记录里查看结果。满意的作品可以公开展示，方便之后复用。"],
];

export default async function HomePage() {
  let publicWorks: GalleryImageView[] = [];
  let galleryError: string | null = null;

  try {
    publicWorks = await listPublicGalleryImages({ limit: 48 });
  } catch {
    galleryError = "作品库暂时不可用，请检查数据库服务。";
  }

  const heroWorks = publicWorks.slice(0, 3);
  const primaryHeroWork = heroWorks[0];
  const secondaryHeroWork = heroWorks[1];
  const tertiaryHeroWork = heroWorks[2];
  const heroCounter = publicWorks.length > 0 ? `${Math.min(heroWorks.length, publicWorks.length).toString().padStart(2, "0")} / ${publicWorks.length.toString().padStart(2, "0")}` : "00 / 00";

  return (
    <main className="space-y-8 pb-28">
      <section className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr] lg:items-stretch">
        <GlassSurface className="order-2 px-6 py-7 text-slate-950 md:px-8 md:py-8 lg:order-1 lg:h-full">
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-sky-100/80 blur-3xl" />
          <div className="relative flex h-full flex-col gap-5">
            <div className="space-y-4">
              <AnimatedContent className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/72 px-3 py-1.5 text-xs font-bold text-slate-500 backdrop-blur">
                <BookOpen className="h-3.5 w-3.5" />
                图片工作台 · 灵感预览
              </AnimatedContent>
              <div className="space-y-4">
                <BlurText
                  as="h1"
                  text="从作品灵感开始"
                  className="max-w-xl font-serif text-4xl font-black leading-[1.02] text-slate-950 md:text-5xl"
                  by="letters"
                  delay={0.012}
                />
                <SplitText
                  as="p"
                  text="先看构图、氛围和光感，再把想法交给右侧工作台。输入一句描述，就能整理提示词、提交生成并保存历史。"
                  className="max-w-xl text-base leading-7 text-slate-500"
                  delay={0.006}
                />
              </div>
            </div>

            <SpotlightCard className="min-h-[18.5rem] flex-1 p-4" spotlightColor="rgba(56, 189, 248, 0.22)">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.98),transparent_26%),radial-gradient(circle_at_86%_78%,rgba(176,201,220,0.65),transparent_40%)]" />

              <div className="relative z-[1] flex h-full min-h-[17.5rem] flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/80 bg-white/68 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.28em] text-slate-500 shadow-sm backdrop-blur">
                    近期作品
                  </span>
                  <span className="font-mono text-[0.68rem] font-black text-slate-400">
                    {heroCounter}
                  </span>
                </div>

                <div className="grid flex-1 gap-3 sm:grid-cols-[1.34fr_0.86fr]">
                  <figure className="relative min-h-[13.5rem] overflow-hidden rounded-[1.75rem] border border-white/85 bg-slate-200 shadow-[0_24px_62px_rgba(31,52,76,0.18)]">
                    {primaryHeroWork?.url ? (
                      <img
                        src={primaryHeroWork.thumbnailUrl || primaryHeroWork.url}
                        alt={primaryHeroWork.title || "公开作品预览"}
                        className="h-full w-full object-cover grayscale-[12%] saturate-[0.82] contrast-[0.98]"
                      />
                    ) : (
                      <div className="h-full w-full bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.92),transparent_24%),linear-gradient(135deg,#dbeafe,#f8fafc_52%,#e2e8f0)]" />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_42%,rgba(5,13,25,0.58))]" />
                    <figcaption className="absolute bottom-5 left-5 max-w-[15rem] text-white">
                      <p className="text-[0.64rem] font-black uppercase tracking-[0.32em] text-white/68">
                        作品 01
                      </p>
                      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">
                        {primaryHeroWork?.title || "等待第一张作品"}
                      </p>
                      <p className="mt-2 max-w-[12rem] text-xs font-semibold leading-5 text-white/70">
                        {primaryHeroWork?.summary || "公开作品会自动成为首页的视觉焦点。"}
                      </p>
                    </figcaption>
                  </figure>

                  <div className="grid gap-3 sm:grid-rows-[1fr_0.92fr]">
                    <figure className="overflow-hidden rounded-[1.55rem] border border-white/85 bg-white/72 p-1.5 shadow-[0_18px_44px_rgba(31,52,76,0.12)] backdrop-blur">
                      {secondaryHeroWork?.url ? (
                        <img
                          src={secondaryHeroWork.thumbnailUrl || secondaryHeroWork.url}
                          alt={secondaryHeroWork.title || "公开作品预览"}
                          className="h-32 w-full rounded-[1.25rem] object-cover grayscale-[10%] saturate-[0.78] sm:h-full"
                        />
                      ) : (
                        <div className="h-32 w-full rounded-[1.25rem] bg-[linear-gradient(135deg,#eff6ff,#ffffff,#e0f2fe)] sm:h-full" />
                      )}
                    </figure>

                    <figure className="overflow-hidden rounded-[1.55rem] border border-white/85 bg-white/76 p-1.5 shadow-[0_18px_44px_rgba(31,52,76,0.12)] backdrop-blur">
                      {tertiaryHeroWork?.url ? (
                        <img
                          src={tertiaryHeroWork.thumbnailUrl || tertiaryHeroWork.url}
                          alt={tertiaryHeroWork.title || "公开作品预览"}
                          className="h-24 w-full rounded-[1.25rem] object-cover grayscale-[8%] saturate-[0.78]"
                        />
                      ) : (
                        <div className="h-24 w-full rounded-[1.25rem] bg-[radial-gradient(circle_at_70%_20%,#ffffff,transparent_28%),linear-gradient(135deg,#e2e8f0,#f8fafc,#dbeafe)]" />
                      )}
                      <figcaption className="flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-600">
                        <span>{tertiaryHeroWork?.title || "公开作品"}</span>
                        <span className="font-mono text-slate-400">{tertiaryHeroWork?.ratio || "3:4"}</span>
                      </figcaption>
                    </figure>
                  </div>
                </div>
              </div>
            </SpotlightCard>

            <div className="flex flex-wrap gap-3">
              <FloatingActionBeam>
                <Link href="/generate" className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-card transition hover:-translate-y-0.5">
                  开始创作
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </FloatingActionBeam>
              <Link href="/prompts" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/76 px-5 py-3 text-sm font-black text-slate-700 shadow-card backdrop-blur transition hover:-translate-y-0.5">
                浏览灵感
              </Link>
            </div>
          </div>
        </GlassSurface>

        <div className="order-1 lg:order-2">
          <GenerateComposer compact />
        </div>
      </section>

      <HomeWorksShowcase
        categories={GALLERY_CATEGORIES}
        initialWorks={publicWorks}
        fallbackPrompts={promptCards}
        galleryError={galleryError}
      />

      <SpotlightCard className="p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">How it works</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">如何使用</h2>
          </div>
          <Link href="/generate" className="hidden items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 md:inline-flex">
            开始创作
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map(([num, title, note]) => (
            <div key={num} className="rounded-[22px] border border-slate-200 bg-slate-50/86 p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-black text-slate-400">{num}</span>
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-lg font-black text-slate-950">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
            </div>
          ))}
        </div>
      </SpotlightCard>
    </main>
  );
}
