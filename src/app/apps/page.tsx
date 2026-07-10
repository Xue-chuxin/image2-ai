import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";

import { APP_DIRECTORY, partitionApps, type AppEntry } from "@/lib/app-directory";

function AppCardBody({ app }: { app: AppEntry }) {
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
  const { available, upcoming } = partitionApps(APP_DIRECTORY);

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500">
            <Lightbulb size={19} />
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">应用中心</p>
            <p className="mt-0.5 text-sm text-ink-secondary">把常用创作应用聚在一处，点击直接进入对应工作台。</p>
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
          {available.map((app) => (
            <Link
              key={app.name}
              href={app.href || "/generate"}
              className="group rounded-2xl border border-line bg-panel p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-pop"
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
          {upcoming.map((app) => (
            <div
              key={app.name}
              className="relative cursor-default rounded-2xl border border-line bg-panel p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-pop"
            >
              <span className="absolute right-4 top-4 rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">
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
