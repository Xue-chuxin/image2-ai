import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminUsersDashboard } from "@/components/admin/admin-users-dashboard";
import { requireAdmin } from "@/lib/auth";
import { listAdminUsers } from "@/lib/admin-users";

export default async function AdminUsersPage() {
  const session = await requireAdmin();
  const users = await listAdminUsers({ limit: 80 });

  return (
    <AdminPageShell active="users" email={session.email} eyebrow="Admin Console" title="运营后台" description="统一管理用户、积分、任务、作品、上传资源、支付和上线自检。">
<AdminUsersDashboard initialUsers={users} />
    </AdminPageShell>
  );
}

