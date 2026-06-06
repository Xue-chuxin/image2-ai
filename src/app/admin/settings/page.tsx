import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { requireAdmin } from "@/lib/auth";
import { getAdminAppSettings } from "@/lib/settings";
export default async function AdminSettingsPage() {
  const session = await requireAdmin();
  const settings = await getAdminAppSettings();

  return (
    <AdminPageShell active="settings" email={session.email} eyebrow="Admin Settings" title="后台配置" description="管理站点标题、模型参数、API Key、存储和 ChatGPT Web 浏览器通道。敏感配置只显示是否已配置，不回显明文。">
<AdminSettingsForm initialSettings={settings} />
    </AdminPageShell>
  );
}

