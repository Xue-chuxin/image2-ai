import Link from "next/link";

import { AdminUsersDashboard } from "@/components/admin/admin-users-dashboard";
import { requireAdmin } from "@/lib/auth";
import { listAdminUsers } from "@/lib/admin-users";

export default async function AdminUsersPage() {
  const session = await requireAdmin();
  const users = await listAdminUsers({ limit: 80 });

  return (
    <main className="space-y-5 pb-28">
      <section className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Admin Console</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-slate-950">运营后台</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">用户、积分、任务、作品、支付和上线自检的运营入口。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/jobs" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              任务运维
            </Link>
            <Link href="/admin/images" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              作品管理
            </Link>
            <Link href="/admin/uploads" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              上传管理
            </Link>
            <Link href="/admin/billing" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              支付配置
            </Link>
            <Link href="/admin/health" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              上线自检
            </Link>
            <Link href="/admin/settings" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              系统配置
            </Link>
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-card">{session.email}</div>
          </div>
        </div>
      </section>

      <AdminUsersDashboard initialUsers={users} />
    </main>
  );
}
