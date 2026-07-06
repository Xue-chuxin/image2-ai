import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Flame,
  Lightbulb,
  ListChecks,
  MessagesSquare,
  Newspaper,
  PenLine,
  Wand2,
} from "lucide-react";

type AppCard = {
  name: string;
  description: string;
  icon: typeof Wand2;
  iconClass: string;
  href?: string;
};

const availableApps: AppCard[] = [
  {
    name: "创意图片生成",
    description: "输入提示词或上传参考图，生成商业级创意图片。",
    icon: Wand2,
    iconClass: "bg-brand-50 text-brand-600",
    href: "/generate",
  },
  {
    name: "提示词整理",
    description: "把零散想法整理成结构化提示词，直接带入创作台使用。",
    icon: ListChecks,
    iconClass: "bg-emerald-50 text-emerald-600",
    href: "/generate",
  },
];

const upcomingApps: AppCard[] = [
  {
    name: "智能助手",
    description: "对话式创作助手，聊着天就把图改好。",
    icon: Bot,
    iconClass: "bg-violet-50 text-violet-600",
  },
  {
    name: "小红书爆款文案",
    description: "按笔记风格生成标题与正文，自带表情与话题标签。",
    icon: Flame,
    iconClass: "bg-rose-50 text-rose-500",
  },
  {
    name: "高情商回复",
    description: "工作群、客户沟通场景的得体回复建议。",
    icon: MessagesSquare,
    iconClass: "bg-amber-50 text-amber-600",
  },
  {
    name: "公众号标题生成器",
    description: "一段摘要生成多条风格各异的公众号标题备选。",
    icon: Newspaper,
    iconClass: "bg-cyan-50 text-cyan-600",
  },
  {
    name: "全能写作助手",
    description: "文案、周报、方案大纲，一站式长文写作辅助。",
    icon: PenLine,
    iconClass: "bg-indigo-50 text-indigo-600",
  },
];

function AppCardBody({ app }: { app: AppCard }) {
  const Icon = app.icon;
  return (
    <div className="flex items-start gap-3.5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${app.iconClass}`}>
        <Icon size={22} />
      </span>
      <div className="min-w-0 space-y-1">
        <h3 className="text-[15px] font-bold text-ink">{app.name}</h3>
        <p className="text-[13px] leading-5 text-ink-secondary">{app.description}</p>
      </div>
    </div>
  );
}

export default function AppsPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <Lightbulb size={19} />
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">应用中心持续扩充中</p>
            <p className="mt-0.5 text-sm text-ink-secondary">更多应用陆续上线，当前可先使用「专业绘画」完成创作。</p>
          </div>
        </div>
        <Link
          href="/generate"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
        >
          去专业绘画
          <ArrowRight size={15} />
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-[17px] font-bold text-ink">现在可用</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {availableApps.map((app) => (
            <Link
              key={app.name}
              href={app.href || "/generate"}
              className="group rounded-2xl border border-line bg-white p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-pop"
            >
              <AppCardBody app={app} />
              <span className="mt-3.5 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600">
                立即使用
                <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[17px] font-bold text-ink">即将上线</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {upcomingApps.map((app) => (
            <div
              key={app.name}
              className="relative cursor-default rounded-2xl border border-line bg-white p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-pop"
            >
              <span className="absolute right-4 top-4 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
                敬请期待
              </span>
              <div className="pr-14">
                <AppCardBody app={app} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
