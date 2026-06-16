import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardReport } from "@/lib/admin-dashboard";

export default async function AdminPage() {
  const session = await requireAdmin();
  const report = await getAdminDashboardReport();

  return (
    <AdminPageShell
      active="dashboard"
      email={session.email}
      eyebrow="Admin Overview"
      title="运营仪表盘"
      description="查看用户、任务、作品、积分和充值数据，快速判断系统当前运行状态。"
      wide
    >
      <AdminDashboard report={report} />
    </AdminPageShell>
  );
}
