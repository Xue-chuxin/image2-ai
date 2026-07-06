import Link from "next/link";
import { ArrowRight, Bot, Layers, MessagesSquare, ScanSearch } from "lucide-react";

type FeatureCard = {
  name: string;
  description: string;
  icon: typeof Bot;
  iconClass: string;
};

const features: FeatureCard[] = [
  {
    name: "多轮对话调图",
    description: "像聊天一样描述修改意见，助手持续微调直到满意。",
    icon: MessagesSquare,
    iconClass: "bg-brand-50 text-brand-600",
  },
  {
    name: "参考图理解",
    description: "发一张参考图，助手自动读懂构图、风格与主体。",
    icon: ScanSearch,
    iconClass: "bg-violet-50 text-violet-600",
  },
  {
    name: "一键生成变体",
    description: "对满意的结果快速衍生多个风格变体，挑选最佳。",
    icon: Layers,
    iconClass: "bg-emerald-50 text-emerald-600",
  },
];

export default function AssistantPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-5">
      <div className="rounded-2xl border border-line bg-white px-5 py-14 text-center shadow-card md:py-20">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-chip">
          <Bot size={28} />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-ink md:text-3xl">智能助手正在路上</h1>
        <p className="mt-3 text-sm leading-6 text-ink-secondary">
          对话式创作体验：用一句话描述想法，助手帮你生成并不断打磨图片。
          <br className="hidden md:block" />
          支持多轮修改与参考图输入，上线后将在这里与你见面。
        </p>
        <Link
          href="/generate"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
        >
          先去专业绘画创作
          <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.name} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${feature.iconClass}`}>
                  <Icon size={19} />
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">规划中</span>
              </div>
              <h3 className="mt-3.5 text-[15px] font-bold text-ink">{feature.name}</h3>
              <p className="mt-1.5 text-[13px] leading-5 text-ink-secondary">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </main>
  );
}
