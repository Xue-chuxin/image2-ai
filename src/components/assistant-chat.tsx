"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Bot, Loader2, Send, Sparkles, UserRound } from "lucide-react";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

type ChatApiResponse = {
  ok?: boolean;
  error?: string;
  reply?: string;
  suggestedPrompt?: string | null;
  source?: "deepseek" | "local";
  warning?: string;
};

const GREETING: ChatMessage = {
  role: "assistant",
  content: "你好！我是造图台的创作助手。告诉我你想画什么，我可以帮你完善画面细节，并给出可直接生图的提示词。",
};

const quickStarts = [
  "帮我设计一张咖啡馆的产品主图",
  "我想要一张国风人像写真",
  "给我一个赛博朋克城市夜景的点子",
];

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [suggestedPrompt, setSuggestedPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setSuggestedPrompt(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 只发送对话内容（不含首条问候），后端会自行注入系统提示词。
        body: JSON.stringify({ messages: nextMessages.filter((m) => m !== GREETING) }),
      });
      const payload = (await response.json()) as ChatApiResponse;

      if (!response.ok || payload.ok === false || !payload.reply) {
        throw new Error(payload.error || "助手暂时无法回复，请稍后再试。");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: payload.reply as string }]);
      setSuggestedPrompt(payload.suggestedPrompt || null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "助手暂时无法回复，请稍后再试。");
    } finally {
      setIsSending(false);
    }
  }

  const generateHref = suggestedPrompt ? `/generate?prompt=${encodeURIComponent(suggestedPrompt)}` : "/generate";

  return (
    <div className="flex h-[calc(100dvh-220px)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-card">
      {/* 消息区 */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((message, index) => (
          <div key={index} className={clsx("flex gap-3", message.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <span
              className={clsx(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                message.role === "user" ? "bg-brand-500 text-white" : "bg-gradient-to-br from-brand-400 to-brand-600 text-white",
              )}
            >
              {message.role === "user" ? <UserRound size={16} /> : <Bot size={16} />}
            </span>
            <div
              className={clsx(
                "max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-6",
                message.role === "user" ? "bg-brand-500 text-white" : "border border-line bg-page/60 text-ink",
              )}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isSending ? (
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
              <Bot size={16} />
            </span>
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-page/60 px-3.5 py-2.5 text-[13px] text-ink-faint">
              <Loader2 className="animate-spin" size={14} />
              正在思考…
            </div>
          </div>
        ) : null}

        {messages.length === 1 && !isSending ? (
          <div className="flex flex-wrap gap-2 pl-11">
            {quickStarts.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => send(item)}
                className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-600"
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* 建议提示词 */}
      {suggestedPrompt ? (
        <div className="border-t border-line bg-brand-50/50 px-5 py-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600">
            <Sparkles size={13} />
            助手给出的提示词
          </div>
          <p className="mt-1.5 text-[13px] leading-6 text-ink">{suggestedPrompt}</p>
          <Link
            href={generateHref}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
          >
            带入创作页生成
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : null}

      {/* 输入区 */}
      <div className="border-t border-line p-3.5">
        {error ? <div className="mb-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-500 dark:text-rose-300">{error}</div> : null}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value.slice(0, 2000))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="描述你想要的画面，Enter 发送，Shift+Enter 换行"
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-line bg-page/60 px-3.5 py-2.5 text-sm leading-6 text-ink outline-none transition focus:border-brand-400 focus:bg-panel"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-chip transition hover:bg-brand-600 disabled:opacity-60"
            aria-label="发送"
          >
            {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
