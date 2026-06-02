import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ImagePlus } from "lucide-react";
import { CopyPromptButton } from "@/components/copy-prompt-button";
import { getPromptBySlug, promptCards } from "@/lib/mock-data";

export function generateStaticParams() {
  return promptCards.map((prompt) => ({ slug: prompt.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const prompt = getPromptBySlug(params.slug);
  return {
    title: prompt ? `${prompt.title} - 灵感详情` : "灵感详情"
  };
}

export default function PromptDetailPage({ params }: { params: { slug: string } }) {
  const prompt = getPromptBySlug(params.slug);
  if (!prompt) notFound();

  return (
    <main className="space-y-6 pb-28">
      <Link href="/prompts" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-card">
        <ArrowLeft className="h-4 w-4" /> 返回灵感库
      </Link>

      <section className="grid gap-5 lg:grid-cols-[.92fr_1.08fr]">
        <div className="liquid-glass overflow-hidden rounded-[30px]">
          <div className="liquid-mask" />
          <div className={`relative ${prompt.heightClass} min-h-[420px] bg-gradient-to-br ${prompt.gradient} p-5`}>
            <div className="absolute right-5 top-5 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-black text-slate-600 backdrop-blur">{prompt.ratio}</div>
            <div className="flex h-full items-end rounded-[24px] border border-white/80 bg-white/38 p-5 shadow-inner backdrop-blur-sm">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Preview</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">{prompt.title}</h1>
                <p className="mt-3 max-w-md text-sm leading-7 text-slate-500">{prompt.summary}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">{prompt.category}</span>
              {prompt.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600">{tag}</span>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href={`/generate?prompt=${encodeURIComponent(prompt.promptZh)}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-card">
                <ImagePlus className="h-4 w-4" /> 带入创作台
              </Link>
              <CopyPromptButton text={prompt.promptZh} label="复制描述" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600" />
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-lg font-black text-slate-950">中文描述</h2>
            <p className="mt-3 rounded-[20px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">{prompt.promptZh}</p>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-lg font-black text-slate-950">英文描述</h2>
            <p className="mt-3 rounded-[20px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">{prompt.promptEn}</p>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-lg font-black text-slate-950">避免元素</h2>
            <p className="mt-3 rounded-[20px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">{prompt.negativePrompt}</p>
          </section>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Use cases</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {prompt.useCases.map((item) => (
              <span key={item} className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">{item}</span>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Source</p>
          <p className="mt-3 text-sm font-black text-slate-950">{prompt.sourceName}</p>
          {prompt.sourceUrl ? <a href={prompt.sourceUrl} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-ocean-700"><ExternalLink className="h-3.5 w-3.5" /> 查看来源</a> : null}
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">License</p>
          <p className="mt-3 text-sm leading-6 text-slate-500">{prompt.licenseNote}</p>
        </div>
      </section>
    </main>
  );
}
