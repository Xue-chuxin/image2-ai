import Link from "next/link";

import { AdminJobsDashboard } from "@/components/admin/admin-jobs-dashboard";
import { requireAdmin } from "@/lib/auth";
import { listAdminGenerationJobs } from "@/lib/generation-jobs";

export default async function AdminJobsPage() {
  const session = await requireAdmin();
  const jobs = await listAdminGenerationJobs(50);

  return (
    <main className="space-y-5 pb-28">
      <section className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Admin Jobs</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-slate-950">生成任务运维</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              查看所有用户的生图任务、Provider、积分、失败原因，并重新执行失败任务。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/billing"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card transition hover:border-ocean-200 hover:text-ocean-700"
            >
              套餐充值
            </Link>
            <Link
              href="/admin/images"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card transition hover:border-ocean-200 hover:text-ocean-700"
            >
              作品管理
            </Link>
            <Link
              href="/admin/uploads"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card transition hover:border-ocean-200 hover:text-ocean-700"
            >
              上传资源
            </Link>
            <Link
              href="/admin/settings"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card transition hover:border-ocean-200 hover:text-ocean-700"
            >
              后台配置
            </Link>
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-card">
              {session.email}
            </div>
          </div>
        </div>
      </section>

      <AdminJobsDashboard initialJobs={jobs} />
    </main>
  );
}
