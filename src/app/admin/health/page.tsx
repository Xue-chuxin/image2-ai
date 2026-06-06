import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleDot, ShieldCheck } from "lucide-react";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { requireAdmin } from "@/lib/auth";
import { getAdminHealthReport, type AdminHealthStatus } from "@/lib/admin-health";

const STATUS_STYLE: Record<AdminHealthStatus, { label: string; className: string; iconClassName: string }> = {
  ok: {
    label: "正常",
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
    iconClassName: "text-emerald-600",
  },
  warning: {
    label: "提示",
    className: "border-amber-100 bg-amber-50 text-amber-700",
    iconClassName: "text-amber-600",
  },
  error: {
    label: "异常",
    className: "border-rose-100 bg-rose-50 text-rose-700",
    iconClassName: "text-rose-600",
  },
};

function StatusIcon({ status }: { status: AdminHealthStatus }) {
  if (status === "ok") {
    return <CheckCircle2 className={`h-5 w-5 ${STATUS_STYLE[status].iconClassName}`} />;
  }
  if (status === "error") {
    return <AlertTriangle className={`h-5 w-5 ${STATUS_STYLE[status].iconClassName}`} />;
  }
  return <CircleDot className={`h-5 w-5 ${STATUS_STYLE[status].iconClassName}`} />;
}

export default async function AdminHealthPage() {
  const session = await requireAdmin();
  const report = await getAdminHealthReport(process.env.NEXT_PUBLIC_SITE_URL);

  return (
    <AdminPageShell
      active="health"
      email={session.email}
      eyebrow="Launch Check"
      title="上线自检"
      description="检查数据库、会话密钥、敏感配置加密、支付回调和本地存储目录，不展示任何密钥明文。"
    >
      <section className="grid gap-3 md:grid-cols-3">
        {[
          ["正常项", report.summary.ok, "bg-emerald-50 text-emerald-700"],
          ["提示项", report.summary.warning, "bg-amber-50 text-amber-700"],
          ["异常项", report.summary.error, "bg-rose-50 text-rose-700"],
        ].map(([label, value, className]) => (
          <div key={label as string} className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-card backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{label as string}</p>
            <p className={`mt-3 inline-flex rounded-2xl px-4 py-2 text-4xl font-black ${className as string}`}>{value as number}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[30px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">System</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">系统检查</h2>
            </div>
            <Link href="/api/admin/health" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              查看 JSON
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {report.items.map((item) => (
              <article key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-card">
                      <StatusIcon status={item.status} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-950">{item.label}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                      {item.detail ? <p className="mt-2 break-all text-xs font-black text-slate-400">{item.detail}</p> : null}
                    </div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${STATUS_STYLE[item.status].className}`}>{STATUS_STYLE[item.status].label}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-card">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Payment</p>
              <h2 className="text-2xl font-black text-slate-950">支付渠道状态</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {report.paymentDiagnostics.map((item) => (
              <article key={item.provider} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-black text-slate-950">{item.label}</h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{item.provider}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${item.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
                      {item.enabled ? "已启用" : "未启用"}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${item.configured ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                      {item.configured ? "配置完整" : "待配置"}
                    </span>
                  </div>
                </div>
                <p className="mt-3 break-all text-xs leading-5 text-slate-500">{item.notifyUrl}</p>
                {item.issues.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.issues.map((issue) => (
                      <span key={issue} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                        {issue}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    </AdminPageShell>
  );
}
