import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminJobsDashboard } from "@/components/admin/admin-jobs-dashboard";
import { requireAdmin } from "@/lib/auth";
import { listAdminGenerationJobs } from "@/lib/generation-jobs";

export default async function AdminJobsPage() {
  const session = await requireAdmin();
  const jobs = await listAdminGenerationJobs(50);

  return (
    <AdminPageShell active="jobs" email={session.email} eyebrow="Admin Jobs" title="生成任务运维" description="查看所有用户的生图任务、Provider、队列位次、积分和失败原因，并重新执行失败任务。" wide>
<AdminJobsDashboard initialJobs={jobs} />
    </AdminPageShell>
  );
}

