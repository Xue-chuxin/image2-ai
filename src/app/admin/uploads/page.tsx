import Link from "next/link";

import { AdminUploadsDashboard } from "@/components/admin/admin-uploads-dashboard";
import { requireAdmin } from "@/lib/auth";
import { listAdminUploadedImages } from "@/lib/uploads";

export default async function AdminUploadsPage() {
  const session = await requireAdmin();
  const images = await listAdminUploadedImages({ limit: 80 });

  return (
    <main className="space-y-5 pb-28">
      <section className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Admin Uploads</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-slate-950">上传资源管理</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">查看用户上传的参考图资源，排查文件大小、类型和用户来源。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/billing" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              套餐充值
            </Link>
            <Link href="/admin/images" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              作品管理
            </Link>
            <Link href="/admin/jobs" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card">
              任务运维
            </Link>
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-card">{session.email}</div>
          </div>
        </div>
      </section>

      <AdminUploadsDashboard initialImages={images} />
    </main>
  );
}
