import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminImagesDashboard } from "@/components/admin/admin-images-dashboard";
import { requireAdmin } from "@/lib/auth";
import { listAdminGalleryImages } from "@/lib/gallery";

export default async function AdminImagesPage() {
  const session = await requireAdmin();
  const images = await listAdminGalleryImages({ limit: 80 });

  return (
    <AdminPageShell active="images" email={session.email} eyebrow="Admin Images" title="作品资产管理" description="查看用户生成图片、公开状态、软删除状态，并对公开作品进行人工下架。">
<AdminImagesDashboard initialImages={images} />
    </AdminPageShell>
  );
}

