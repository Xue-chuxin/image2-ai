import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { requireAdmin } from "@/lib/auth";
import { getAdminAppSettings } from "@/lib/settings";

export default async function AdminSettingsPage() {
  const session = await requireAdmin();
  const settings = await getAdminAppSettings();

  return (
    <main className="space-y-5 pb-28">
      <section className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Admin</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-slate-950">后台配置</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              管理站点标题、模型参数和 API Key。敏感配置只显示是否已配置，不回显明文。
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-card">
            {session.email}
          </div>
        </div>
      </section>
      <AdminSettingsForm initialSettings={settings} />
    </main>
  );
}
