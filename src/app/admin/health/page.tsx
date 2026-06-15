import { AdminHealthDashboard } from "@/components/admin/admin-health-dashboard";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { requireAdmin } from "@/lib/auth";
import { getAdminHealthReport } from "@/lib/admin-health";

export default async function AdminHealthPage() {
  const session = await requireAdmin();
  const report = await getAdminHealthReport(process.env.NEXT_PUBLIC_SITE_URL);

  return (
    <AdminPageShell
      active="health"
      email={session.email}
      eyebrow="Launch Check"
      title="上线自检"
      description="检查数据库、会话密钥、生图通道、任务状态、支付回调和本地存储风险，不展示任何密钥明文。"
    >
      <AdminHealthDashboard report={report} />
    </AdminPageShell>
  );
}
