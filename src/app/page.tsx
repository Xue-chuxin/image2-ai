import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { GenerateComposer } from "@/components/generate-composer";
import { BlurText, GlassSurface, SpotlightCard, SplitText } from "@/components/front/react-bits";
import { HomeWorksShowcase } from "@/components/home-works-showcase";
import { GALLERY_CATEGORIES, listPublicGalleryImages, type GalleryImageView } from "@/lib/gallery";
import { promptCards } from "@/lib/mock-data";

const steps = [
  ["01", "写清画面", "先把主体、场景、镜头和比例写清楚。页面会保留你的原意，不把描述改成模板话术。"],
  ["02", "选择方向", "从写真、商品、角色、界面、建筑、插画、国风和其他里选择方向，也可以先用润色功能整理文字。"],
  ["03", "生成并归档", "提交任务后到记录里查看结果。满意的作品可以公开展示，方便之后复用。"],
];

function ArtworkPreviewImage({
  work,
  alt,
  className,
}: {
  work?: GalleryImageView;
  alt: string;
  className?: string;
}) {
  const imageUrl = work?.thumbnailUrl || work?.url;

  return (
    <div className={`relative min-h-0 overflow-hidden rounded-[1.35rem] bg-slate-100 ${className || ""}`}>
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-xl saturate-[0.78]"
          />
          <div className="absolute inset-0 bg-white/38" />
          <img
            src={imageUrl}
            alt={work?.title || alt}
            className="relative z-[1] h-full w-full object-contain p-1.5"
          />
        </>
      ) : (
        <div className="h-full w-full bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.92),transparent_24%),linear-gradient(135deg,#dbeafe,#f8fafc_52%,#e2e8f0)]" />
      )}
    </div>
  );
}

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
        <GlassSurface className="order-2 rounded-[28px] px-6 py-7 text-slate-950 md:px-8 md:py-8 lg:order-1 lg:h-full">
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-sky-100/80 blur-3xl" />
          <div className="relative flex h-full flex-col gap-5">
            <div>
              <span className="eyebrow">Inspiration</span>
              <BlurText
                as="h1"
                text="先看灵感再生成"
                className="max-w-xl font-serif text-4xl font-black leading-[1.02] text-slate-950 md:text-5xl"
                by="letters"
                delay={0.012}
              />
              <SplitText
                as="p"
                text="挑一张构图和氛围作参考，把想法放到右侧工作台。描述、整理、生成和保存都在同一屏完成。"
                className="max-w-xl text-base leading-7 text-slate-500"
                delay={0.006}
              />
            </div>

            <SpotlightCard className="p-4" spotlightColor="rgba(56, 189, 248, 0.22)">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.98),transparent_26%),radial-gradient(circle_at_86%_78%,rgba(176,201,220,0.65),transparent_40%)]" />

              <div className="relative z-[1] flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/80 bg-white/68 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.28em] text-slate-500 shadow-sm backdrop-blur">
                    近期作品
                  </span>
                  <span className="font-mono text-[0.68rem] font-black text-slate-400">
                    {heroCounter}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { work: primaryHeroWork, index: "01", ratio: primaryHeroWork?.ratio || "1:1" },
                    { work: secondaryHeroWork, index: "02", ratio: secondaryHeroWork?.ratio || "1:1" },
                    { work: tertiaryHeroWork, index: "03", ratio: tertiaryHeroWork?.ratio || "3:4" },
                  ].map((item) => (
                    <figure
                      key={item.index}
                      className="grid min-w-0 grid-rows-[auto_auto] overflow-hidden rounded-[1.45rem] border border-white/85 bg-white/74 p-1.5 shadow-[0_18px_44px_rgba(31,52,76,0.1)] backdrop-blur"
                    >
                      <ArtworkPreviewImage work={item.work} alt="公开作品预览" className="aspect-[4/3] rounded-[1.15rem]" />
                      <figcaption className="flex items-center justify-between gap-2 px-2 py-2 text-xs font-bold text-slate-600">
                        <span className="truncate">
                          {item.index}. {item.work?.title || "公开作品"}
                        </span>
                        <span className="shrink-0 font-mono text-slate-400">{item.ratio}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </SpotlightCard>

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
