import Link from "next/link";

import { PromptPolishStudio } from "@/components/prompt-polish-studio";

export const dynamic = "force-dynamic";

export default function PromptPolishPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-ink">提示词润色</h1>
          <p className="text-sm leading-6 text-ink-secondary">把一句大白话描述，扩写成可直接生图的中/英文提示词与负向词，并给出风格标签与建议比例。</p>
        </div>
        <Link
          href="/prompts"
          className="inline-flex items-center rounded-xl border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-page"
        >
          提示词库
        </Link>
      </section>
      <PromptPolishStudio />
    </main>
  );
}
