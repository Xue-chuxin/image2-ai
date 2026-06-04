import Link from "next/link";

import { AdminBillingDashboard } from "@/components/admin/admin-billing-dashboard";
import { requireAdmin } from "@/lib/auth";
import { getBillingPaymentSettings, listAdminCreditPackages, listAdminRechargeOrders } from "@/lib/billing";

export default async function AdminBillingPage() {
  const session = await requireAdmin();
  const [packages, orders, paymentSettings] = await Promise.all([listAdminCreditPackages(), listAdminRechargeOrders({ limit: 80 }), getBillingPaymentSettings()]);

  return (
    <main className="space-y-5 pb-28">
      <section className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Admin Billing</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-slate-950">套餐与充值</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">管理积分套餐、查看充值订单，并在阶段 9A 用人工确认方式发放积分。</p>
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
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-card">{session.email}</div>
          </div>
        </div>
      </section>

      <AdminBillingDashboard initialPackages={packages} initialOrders={orders} initialPaymentSettings={paymentSettings} />
    </main>
  );
}
