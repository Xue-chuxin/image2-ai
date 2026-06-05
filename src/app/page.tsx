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
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                <BookOpen className="h-3.5 w-3.5" />
                图片工作台 · 作品灵感
              </div>
              <div className="space-y-4">
                <h1 className="max-w-2xl font-serif text-4xl font-black leading-[1.02] tracking-[-0.06em] text-slate-950 md:text-6xl">把描述整理成一张能用的图</h1>
                <p className="max-w-xl text-base leading-8 text-slate-500">
                  一个更像 App 的在线图片工作台：写描述、整理提示词、生成图片、管理历史。页面尽量保持安静，把注意力留给画面本身。
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                [publicWorks.length ? String(publicWorks.length) : "48", "公开作品"],
                ["5 分", "标准生成"],
                ["3 步", "完成流程"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-[18px] border border-slate-200 bg-slate-50/86 p-4">
                  <p className="text-2xl font-black text-slate-950">{value}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
                </div>
              ))}
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
