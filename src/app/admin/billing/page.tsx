import Link from "next/link";

import { AdminBillingDashboard } from "@/components/admin/admin-billing-dashboard";
import { requireAdmin } from "@/lib/auth";
import { getBillingPaymentSettings, listAdminCreditPackages, listAdminRechargeOrders } from "@/lib/billing";
import { getPaymentDiagnostics, listAdminPaymentEvents } from "@/lib/payment-diagnostics";

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusClass(status: string) {
  if (status === "VERIFIED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "FAILED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-white text-slate-500";
}

export default async function AdminBillingPage() {
  const session = await requireAdmin();
  const [packages, orders, paymentSettings, diagnostics, events] = await Promise.all([
    listAdminCreditPackages(),
    listAdminRechargeOrders({ limit: 80 }),
    getBillingPaymentSettings(),
    getPaymentDiagnostics(process.env.NEXT_PUBLIC_SITE_URL),
    listAdminPaymentEvents({ limit: 12 }),
  ]);

  return (
    <main className="space-y-5 pb-28">
      <section className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Admin Billing</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-slate-950">套餐与在线支付</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">配置易支付、支付宝当面付、微信支付和 PayPal。人工审核充值已关闭。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/jobs" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              任务运维
            </Link>
            <Link href="/admin/images" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              作品管理
            </Link>
            <Link href="/admin/settings" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              后台配置
            </Link>
            <Link href="/admin/health" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              上线自检
            </Link>
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-card">{session.email}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[30px] border border-slate-200 bg-white/86 p-5 shadow-card backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Payment Diagnostics</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">支付联调面板</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">把回调地址填到对应支付平台。线上联调必须使用公网可访问域名。</p>
            </div>
            <Link href="/api/admin/payments/diagnostics" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              查看 JSON
            </Link>
          </div>

          <div className="mt-4 grid gap-3">
            {diagnostics.map((item) => (
              <div key={item.provider} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
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
                <div className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                  <p>
                    <span className="font-black text-slate-700">Notify：</span>
                    <span className="break-all">{item.notifyUrl}</span>
                  </p>
                  <p>
                    <span className="font-black text-slate-700">Return：</span>
                    <span className="break-all">{item.returnUrl}</span>
                  </p>
                </div>
                {item.issues.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.issues.map((issue) => (
                      <span key={issue} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                        {issue}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white/86 p-5 shadow-card backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Payment Events</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">最近支付事件</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">记录回调验签、返回页 capture 和失败原因。</p>
            </div>
            <Link href="/api/admin/payments/events" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              查看 JSON
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {events.length > 0 ? (
              events.map((event) => (
                <div key={event.id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(event.status)}`}>{event.status}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">{event.provider}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">{event.eventType}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{formatTime(event.createdAt)}</span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
                    <p>
                      <span className="font-black text-slate-700">订单：</span>
                      {event.orderNo || "未识别"}
                    </p>
                    {event.providerTradeNo ? (
                      <p>
                        <span className="font-black text-slate-700">渠道流水：</span>
                        {event.providerTradeNo}
                      </p>
                    ) : null}
                    <p>
                      <span className="font-black text-slate-700">原因：</span>
                      {event.message || "无"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm font-bold text-slate-400">暂无支付事件，完成一次支付回调后会出现在这里。</div>
            )}
          </div>
        </div>
      </section>

      <AdminBillingDashboard initialPackages={packages} initialOrders={orders} initialPaymentSettings={paymentSettings} />
    </main>
  );
}
