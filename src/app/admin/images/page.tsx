import Link from "next/link";

import { AdminImagesDashboard } from "@/components/admin/admin-images-dashboard";
import { requireAdmin } from "@/lib/auth";
import { listAdminGalleryImages } from "@/lib/gallery";

export default async function AdminImagesPage() {
  const session = await requireAdmin();
  const images = await listAdminGalleryImages({ limit: 80 });

  return (
    <main className="space-y-5 pb-28">
      <section className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Admin Images</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-slate-950">作品资产管理</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">查看用户生成图片、公开状态、软删除状态，并对公开作品进行人工下架。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/jobs"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card transition hover:border-ocean-200 hover:text-ocean-700"
            >
              任务运维
            </Link>
            <Link
              href="/admin/settings"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card transition hover:border-ocean-200 hover:text-ocean-700"
            >
              后台配置
            </Link>
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-card">{session.email}</div>
          </div>
        </div>
      </section>

      <AdminImagesDashboard initialImages={images} />
    </main>
  );
}
