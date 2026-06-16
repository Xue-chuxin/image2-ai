import Link from "next/link";
import { ArrowRight, CheckCircle2, ImageDown, PenLine, WandSparkles } from "lucide-react";
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

const flowSteps = [
  {
    title: "写下画面",
    note: "把主体、场景、镜头和氛围先写出来，不需要一开始就很专业。",
    Icon: PenLine,
  },
  {
    title: "整理描述",
    note: "需要时先润色提示词，让模型更容易理解你的画面意图。",
    Icon: WandSparkles,
  },
  {
    title: "生成保存",
    note: "提交任务后自动归档到记录，后续可以复制提示词继续迭代。",
    Icon: ImageDown,
  },
];

export default async function HomePage() {
  let publicWorks: GalleryImageView[] = [];
  let galleryError: string | null = null;

  try {
    publicWorks = await listPublicGalleryImages({ limit: 48 });
  } catch {
    galleryError = "作品库暂时不可用，请检查数据库服务。";
  }

  return (
    <main className="space-y-8 pb-28">
      <section className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr] lg:items-stretch">
        <GlassSurface className="order-2 rounded-[28px] px-6 py-7 text-slate-950 md:px-8 md:py-8 lg:order-1 lg:h-full">
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-sky-100/80 blur-3xl" />
          <div className="relative flex h-full flex-col gap-6">
            <div>
              <span className="eyebrow">Studio Flow</span>
              <BlurText
                as="h1"
                text="从一句描述开始创作"
                className="max-w-xl font-serif text-4xl font-black leading-[1.02] text-slate-950 md:text-5xl"
                by="letters"
                delay={0.012}
              />
              <SplitText
                as="p"
                text="先把脑子里的画面写下来，右侧工作台会帮你完成整理、生成和保存。首页只保留创作路径，把注意力留给输入本身。"
                className="max-w-xl text-base leading-7 text-slate-500"
                delay={0.006}
              />
            </div>

            <div className="grid gap-3">
              {flowSteps.map(({ title, note, Icon }, index) => (
                <div key={title} className="group rounded-[22px] border border-white/85 bg-white/68 p-4 shadow-[0_16px_42px_rgba(31,52,76,0.08)] backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-white/82">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50/86 text-ocean-700 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-300">{String(index + 1).padStart(2, "0")}</span>
                        <h2 className="text-base font-black text-slate-950">{title}</h2>
                      </div>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{note}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-wrap gap-3 pt-1">
              <Link href="/generate" className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/90 px-5 py-3 text-sm font-black text-ocean-800 shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">
                开始创作
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/prompts" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/78 px-5 py-3 text-sm font-black text-slate-700 shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">
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
