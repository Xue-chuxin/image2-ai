import Link from "next/link";
import { LogIn, WalletCards } from "lucide-react";

import { AccountBillingPanel } from "@/components/account-billing-panel";
import { getUserSession } from "@/lib/auth";
import { getUserBillingOverview } from "@/lib/billing";

export default async function AccountPage() {
  const session = await getUserSession();

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-[1200px] space-y-5">
        <div className="mx-auto mt-8 w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card md:mt-16">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-chip">
            <WalletCards size={22} />
          </div>
          <h1 className="mt-4 text-xl font-bold text-ink">用户中心</h1>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">登录后可以查看积分余额、在线充值和订单记录。</p>
          <Link
            href="/signin?next=/account"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
          >
            <LogIn size={15} />
            登录账号
          </Link>
        </div>
      </main>
    );
  }

  const overview = await getUserBillingOverview(session.userId);

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink md:text-3xl">用户中心</h1>
        <p className="mt-1.5 text-sm leading-6 text-ink-secondary">{session.email} · 在线支付成功后积分会自动到账。</p>
      </div>

      <AccountBillingPanel balance={overview.balance} packages={overview.packages} initialOrders={overview.orders} channels={overview.channels} />
    </main>
  );
}
