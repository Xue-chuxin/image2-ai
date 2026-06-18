import Link from "next/link";
import { WalletCards } from "lucide-react";

import { AccountBillingPanel } from "@/components/account-billing-panel";
import { BlurText, SpotlightCard } from "@/components/front/react-bits";
import { getUserSession } from "@/lib/auth";
import { getUserBillingOverview } from "@/lib/billing";

export default async function AccountPage() {
  const session = await getUserSession();

  if (!session) {
    return (
      <main className="mx-auto max-w-xl pb-28">
        <SpotlightCard className="p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ocean-800 text-white shadow-glow">
            <WalletCards className="h-6 w-6" />
          </div>
          <BlurText as="h1" text="账户与积分" className="mt-5 w-full justify-center text-center text-3xl font-black text-slate-950" delay={0.035} />
          <p className="mt-3 text-sm leading-7 text-slate-500">登录后可以查看积分余额、在线充值订单和历史记录。</p>
          <Link href="/signin?next=/account" className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            登录
          </Link>
        </SpotlightCard>
      </main>
    );
  }

  const overview = await getUserBillingOverview(session.userId);

  return (
    <main className="space-y-5 pb-28">
      <SpotlightCard className="p-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Account</p>
        <div className="mt-2 flex flex-col items-center justify-center gap-3">
          <div className="w-full">
            <BlurText as="h1" text="账户与积分" className="w-full justify-center text-center text-3xl font-black text-slate-950" delay={0.035} />
            <p className="mt-2 text-sm leading-6 text-slate-500">{session.email} · 在线支付成功后积分会自动到账。</p>
          </div>
          <Link href="/generate" className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-card">
            去创作
          </Link>
        </div>
      </SpotlightCard>

      <AccountBillingPanel balance={overview.balance} packages={overview.packages} initialOrders={overview.orders} channels={overview.channels} />
    </main>
  );
}
