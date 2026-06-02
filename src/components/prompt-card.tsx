import Link from "next/link";
import { Eye, Heart, ImageIcon } from "lucide-react";
import { CopyPromptButton } from "@/components/copy-prompt-button";
import type { PromptCardData } from "@/lib/mock-data";

export function PromptCard({ prompt }: { prompt: PromptCardData }) {
  return (
    <article className="liquid-glass group mb-4 inline-block w-full overflow-hidden rounded-[24px] transition duration-300 hover:-translate-y-1">
      <div className="liquid-mask" />
      <div className={`relative ${prompt.heightClass} bg-gradient-to-br ${prompt.gradient} p-4`}>
        <div className="absolute right-4 top-4 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-black text-slate-600 backdrop-blur">
          {prompt.ratio}
        </div>
        <div className="flex h-full items-end rounded-[20px] border border-white/80 bg-white/38 p-4 text-slate-900 shadow-inner backdrop-blur-sm">
          <div>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 text-slate-600">
              <ImageIcon className="h-4 w-4" />
            </div>
            <p className="text-xl font-black leading-tight">{prompt.visual}</p>
          </div>
        </div>
      </div>
      <div className="relative space-y-4 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{prompt.category}</p>
          <Link href={`/prompts/${prompt.slug}`} className="mt-1 block text-lg font-black leading-tight text-slate-950 transition group-hover:text-ocean-800">
            {prompt.title}
          </Link>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{prompt.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {prompt.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-400">
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{prompt.views}</span>
          <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{prompt.likes}</span>
          <CopyPromptButton text={prompt.promptZh} label="套用" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-black text-slate-600 transition hover:bg-slate-50" />
        </div>
      </div>
    </article>
  );
}
