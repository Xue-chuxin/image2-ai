import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { GenerateComposer } from "@/components/generate-composer";
import { HomeWorksShowcase } from "@/components/home-works-showcase";
import { GALLERY_CATEGORIES, listPublicGalleryImages } from "@/lib/gallery";
import { promptCards } from "@/lib/mock-data";

const steps = [
  ["01", "写清画面", "先把主体、场景、镜头和比例写清楚。页面会保留你的原意，不把描述改成模板话术。"],
  ["02", "选择方向", "从写真、商品、角色、界面、插画、建筑里选择方向，也可以先用润色功能整理文字。"],
  ["03", "生成并归档", "提交任务后到记录里查看结果。满意的作品可以公开展示，方便之后复用。"],
];

export default async function HomePage() {
  const publicWorks = await listPublicGalleryImages({ limit: 48 }).catch(() => []);

  return (
    <main className="space-y-8 pb-28">
      <section className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr] lg:items-stretch">
        <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white/88 px-6 py-7 text-slate-950 shadow-card backdrop-blur animate-float-in md:px-8 md:py-9">
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#e6eef6] blur-3xl" />
          <div className="relative flex h-full flex-col gap-5">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                <BookOpen className="h-3.5 w-3.5" />
                图片工作台 · 作品灵感
              </div>
              <div className="space-y-4">
                <h1 className="max-w-2xl font-serif text-4xl font-black leading-[1.02] tracking-[-0.06em] text-slate-950 md:text-6xl">把描述整理成一张能用的图</h1>
                <p className="max-w-xl text-base leading-7 text-slate-500">
                  一个更像 App 的在线图片工作台：写描述、整理提示词、生成图片、管理历史。页面尽量保持安静，把注意力留给画面本身。
                </p>
              </div>
            </div>

            <div className="relative min-h-[25rem] flex-1 overflow-hidden rounded-[2.2rem] border border-white/75 bg-[#edf3f7] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_26px_76px_rgba(42,65,92,0.14)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.98),transparent_24%),radial-gradient(circle_at_86%_78%,rgba(175,202,220,0.72),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.1),rgba(96,125,153,0.1))]" />
              <div className="absolute -left-16 top-24 h-52 w-52 rounded-full bg-white/55 blur-3xl" />
              <div className="absolute right-8 top-7 z-[6] rounded-full border border-white/80 bg-white/62 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.28em] text-slate-500 shadow-sm backdrop-blur">
                Art board
              </div>

              <figure className="absolute inset-x-4 bottom-4 top-4 z-[1] overflow-hidden rounded-[1.85rem] border border-white/80 bg-slate-200 shadow-[0_26px_70px_rgba(31,52,76,0.2)]">
                <img
                  src="https://picsum.photos/seed/image-studio-mist/920/1120"
                  alt="蓝灰色调的湖面与山雾作品预览"
                  className="h-full w-full object-cover grayscale-[20%] saturate-[0.76] contrast-[0.96]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,18,31,0.12),transparent_34%,rgba(255,255,255,0.2)),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_44%,rgba(5,13,25,0.58))]" />
                <div className="absolute left-0 top-0 h-full w-20 bg-white/14 backdrop-blur-[1px]" />
                <figcaption className="absolute bottom-6 left-6 max-w-[15rem] text-white">
                  <p className="text-[0.64rem] font-black uppercase tracking-[0.32em] text-white/66">
                    Gallery 01
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.06em]">
                    雨后山谷
                  </p>
                  <p className="mt-2 max-w-[12rem] text-xs font-semibold leading-5 text-white/68">
                    山雾、湿冷空气和低饱和色调，适合做安静的封面画面。
                  </p>
                </figcaption>
              </figure>

              <div className="absolute left-8 top-24 z-[4] hidden h-44 w-14 overflow-hidden rounded-full border border-white/70 bg-white/28 shadow-[0_18px_44px_rgba(31,52,76,0.16)] backdrop-blur sm:block">
                <div className="h-full w-full bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.7)_0_8px,rgba(91,112,134,0.08)_8px_16px)]" />
              </div>

              <figure className="absolute right-8 top-20 z-[5] hidden w-32 rotate-6 overflow-hidden rounded-[1.6rem] border border-white/90 bg-white/74 p-1 shadow-[0_24px_56px_rgba(31,52,76,0.2)] backdrop-blur sm:block">
                <img
                  src="https://picsum.photos/seed/image-studio-portrait/420/560"
                  alt="柔和自然光人像作品预览"
                  className="h-40 w-full rounded-[1.25rem] object-cover grayscale-[14%] saturate-[0.72]"
                />
              </figure>

              <figure className="absolute -right-4 bottom-10 z-[5] hidden w-56 -rotate-6 overflow-hidden rounded-[1.7rem] border border-white/90 bg-white/78 p-1.5 shadow-[0_28px_62px_rgba(31,52,76,0.24)] backdrop-blur sm:block">
                <img
                  src="https://picsum.photos/seed/image-studio-still-life/520/390"
                  alt="静物产品布景作品预览"
                  className="h-28 w-full rounded-[1.35rem] object-cover grayscale-[12%] saturate-[0.72]"
                />
                <figcaption className="flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-600">
                  <span>静物布景</span>
                  <span className="font-mono text-slate-400">3:4</span>
                </figcaption>
              </figure>

              <div className="absolute left-8 top-7 z-[6] rounded-full border border-white/80 bg-white/64 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.28em] text-slate-500 shadow-sm backdrop-blur">
                Selected works
              </div>
            </div>
          </div>
        </div>

        <GenerateComposer compact />
      </section>

      <HomeWorksShowcase categories={GALLERY_CATEGORIES} initialWorks={publicWorks} fallbackPrompts={promptCards} />

      <section className="rounded-[30px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur md:p-6">
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
      </section>
    </main>
  );
}
