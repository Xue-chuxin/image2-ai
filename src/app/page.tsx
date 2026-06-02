import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Search, SlidersHorizontal } from "lucide-react";
import { GenerateComposer } from "@/components/generate-composer";
import { PromptCard } from "@/components/prompt-card";
import { categories, promptCards } from "@/lib/mock-data";

const steps = [
  ["01", "写画面", "输入主体、风格、比例和细节。"],
  ["02", "选风格", "从写真、商品、角色、界面中选择方向。"],
  ["03", "生成图", "提交任务后在记录里查看结果。"]
];

export default function HomePage() {
  return (
    <main className="space-y-8 pb-28">
      <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr] lg:items-stretch">
        <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white px-6 py-7 text-slate-950 shadow-card animate-float-in md:px-8 md:py-9">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-50 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                <BookOpen className="h-3.5 w-3.5" />
                作品灵感 · 每周更新
              </div>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-black leading-[1.02] tracking-tight md:text-5xl">把一句描述变成一张图</h1>
                <p className="max-w-xl text-base leading-8 text-slate-500">更像一个在线图片工作台：写描述、选风格、看作品。页面保持浅色、安静，减少模板化的科技感。</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["2,541", "灵感"],
                ["1 min", "处理"],
                ["3 步", "完成"]
              ].map(([value, label]) => (
                <div key={label} className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-2xl font-black text-slate-950">{value}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <GenerateComposer compact />
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-card md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Works</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">作品展示</h2>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:max-w-md">
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="truncate text-sm font-bold text-slate-400">搜索风格、场景或用途</span>
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((category, index) => (
            <span key={category} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black ${index === 0 ? "border-slate-950 bg-slate-950 text-white shadow-card" : "border-slate-200 bg-white text-slate-600"}`}>
              {category}
            </span>
          ))}
        </div>
      </section>

      <section className="columns-1 gap-4 md:columns-2 xl:columns-3">
        {promptCards.map((prompt) => (
          <div key={prompt.slug} className="break-inside-avoid">
            <PromptCard prompt={prompt} />
          </div>
        ))}
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-card md:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">How it works</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">如何使用</h2>
          </div>
          <Link href="/generate" className="hidden items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white md:inline-flex">
            开始 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map(([num, title, note]) => (
            <div key={num} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
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