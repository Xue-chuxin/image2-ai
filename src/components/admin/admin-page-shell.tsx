import type { ReactNode } from "react";
import Link from "next/link";

type AdminTabKey = "users" | "jobs" | "images" | "uploads" | "billing" | "health" | "settings";

const adminTabs: Array<{
  key: AdminTabKey;
  href: string;
  label: string;
  description: string;
}> = [
  { key: "users", href: "/admin/users", label: "用户", description: "账号与积分" },
  { key: "jobs", href: "/admin/jobs", label: "任务", description: "生图队列" },
  { key: "images", href: "/admin/images", label: "作品", description: "公开图库" },
  { key: "uploads", href: "/admin/uploads", label: "上传", description: "参考图" },
  { key: "billing", href: "/admin/billing", label: "支付", description: "套餐与渠道" },
  { key: "health", href: "/admin/health", label: "自检", description: "上线状态" },
  { key: "settings", href: "/admin/settings", label: "配置", description: "站点与模型" },
];

export function AdminPageShell({
  active,
  email,
  eyebrow,
  title,
  description,
  children,
}: {
  active: AdminTabKey;
  email?: string | null;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="space-y-5 pb-28">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white/88 shadow-card backdrop-blur">
        <div className="flex flex-col gap-5 p-5 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">{title}</h1>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500">{description}</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-card">
              {email || "admin"}
            </div>
          </div>

          <nav className="rounded-[24px] border border-slate-200 bg-slate-50/78 p-2">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {adminTabs.map((tab) => {
                const selected = tab.key === active;
                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    className={`group min-w-[7.2rem] rounded-[18px] px-4 py-3 transition ${
                      selected
                        ? "bg-slate-950 text-white shadow-[0_18px_38px_rgba(15,23,42,0.22)]"
                        : "bg-white/70 text-slate-600 hover:bg-white hover:text-slate-950"
                    }`}
                  >
                    <span className="block text-sm font-black">{tab.label}</span>
                    <span className={`mt-1 block text-[0.68rem] font-bold ${selected ? "text-white/58" : "text-slate-400"}`}>
                      {tab.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </section>

      {children}
    </main>
  );
}
