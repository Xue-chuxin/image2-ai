import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminImagesDashboard } from "@/components/admin/admin-images-dashboard";
import { requireAdmin } from "@/lib/auth";
import { listAdminCuratedGalleryImages, listAdminGalleryImages } from "@/lib/gallery";

export default async function AdminImagesPage() {
  const session = await requireAdmin();
  const [images, curatedImages] = await Promise.all([
    listAdminGalleryImages({ limit: 80 }),
    listAdminCuratedGalleryImages({ limit: 80 }),
  ]);

  return (
    <AdminPageShell
      active="images"
      email={session.email}
      eyebrow="Admin Images"
      title="作品资产管理"
      description="查看用户生成图片、公开状态和运营精选作品，并对公开内容进行人工下架。"
    >
      <AdminImagesDashboard initialImages={images} initialCuratedImages={curatedImages} />
    </AdminPageShell>
  );
}
