import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminRelayRecommendations } from "@/components/admin/admin-relay-recommendations";
import { requireAdmin } from "@/lib/auth";
import { relayRecommendations } from "@/lib/relay-recommendations";

export default async function AdminRelaysPage() {
  const session = await requireAdmin();

  return (
    <AdminPageShell
      active="relays"
      email={session.email}
      eyebrow="Relay Picks"
      title="中转站推荐"
      description="集中展示可作为 OpenAI 兼容通道候选的中转站入口，点击 Logo 即可跳转到对应官网。"
    >
      <AdminRelayRecommendations items={relayRecommendations} />
    </AdminPageShell>
  );
}
