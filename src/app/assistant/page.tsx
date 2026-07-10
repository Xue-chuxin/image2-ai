import Link from "next/link";
import { Bot } from "lucide-react";

import { AssistantChat } from "@/components/assistant-chat";

export const dynamic = "force-dynamic";

export default function AssistantPage() {
  return (
    <main className="mx-auto w-full max-w-[900px] space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-chip">
            <Bot size={22} />
          </span>
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold text-ink">智能助手</h1>
            <p className="text-sm leading-6 text-ink-secondary">用对话把想法聊清楚，助手会帮你整理出可直接生图的提示词。</p>
          </div>
        </div>
        <Link
          href="/generate"
          className="inline-flex items-center rounded-xl border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-page"
        >
          专业绘画
        </Link>
      </section>
      <AssistantChat />
    </main>
  );
}
