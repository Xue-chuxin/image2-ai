import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminUploadsDashboard } from "@/components/admin/admin-uploads-dashboard";
import { requireAdmin } from "@/lib/auth";
import { listAdminUploadedImages } from "@/lib/uploads";

export default async function AdminUploadsPage() {
  const session = await requireAdmin();
  const images = await listAdminUploadedImages({ limit: 80 });

  return (
    <AdminPageShell active="uploads" email={session.email} eyebrow="Admin Uploads" title="上传资源管理" description="查看用户上传的参考图资源，排查文件大小、类型和用户来源。">
<AdminUploadsDashboard initialImages={images} />
    </AdminPageShell>
  );
}

