import { AdminBillingDashboard } from "@/components/admin/admin-billing-dashboard";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminPaymentDiagnostics } from "@/components/admin/admin-payment-diagnostics";
import { requireAdmin } from "@/lib/auth";
import { getBillingPaymentSettings, listAdminCreditPackages, listAdminRechargeOrders } from "@/lib/billing";
import { getPaymentDiagnostics, listAdminPaymentEvents } from "@/lib/payment-diagnostics";

export default async function AdminBillingPage() {
  const session = await requireAdmin();
  const [packages, orders, paymentSettings, diagnostics, events] = await Promise.all([
    listAdminCreditPackages(),
    listAdminRechargeOrders({ limit: 80 }),
    getBillingPaymentSettings(),
    getPaymentDiagnostics(process.env.NEXT_PUBLIC_SITE_URL),
    listAdminPaymentEvents({ limit: 12 }),
  ]);

  return (
    <AdminPageShell
      active="billing"
      email={session.email}
      eyebrow="Admin Billing"
      title="套餐与在线支付"
      description="配置易支付、支付宝当面付、微信支付和 PayPal。人工审核充值已关闭。"
      wide
    >
      <AdminBillingDashboard
        initialPackages={packages}
        initialOrders={orders}
        initialPaymentSettings={paymentSettings}
        diagnosticsPanel={
          <AdminPaymentDiagnostics
            diagnostics={diagnostics}
            events={events.map((event) => ({
              id: event.id,
              provider: event.provider,
              eventType: event.eventType,
              status: event.status,
              orderNo: event.orderNo,
              providerTradeNo: event.providerTradeNo,
              message: event.message,
              createdAt: event.createdAt.toISOString(),
            }))}
          />
        }
      />
    </AdminPageShell>
  );
}
