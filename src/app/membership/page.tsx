import Link from "next/link";
import { BadgeCheck, Coins, Crown, Gauge, LockKeyhole, Percent } from "lucide-react";

import { MembershipPlans } from "@/components/membership-plans";
import { getUserSession } from "@/lib/auth";
import { getUserBillingOverview, type BillingOverview } from "@/lib/billing";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export default async function MembershipPage() {
  const session = await getUserSession();

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-[1200px] space-y-5">
        <div className="flex justify-center py-10 md:py-16">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <LockKeyhole className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-lg font-bold text-ink">请先登录</h1>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              登录后即可查看会员权益、开通或续费你的 VIP 会员。
            </p>
            <Link
              href="/signin?next=/membership"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
            >
              去登录
            </Link>
          </div>
        </div>
      </main>
    );
  }

  let overview: BillingOverview | null = null;
  try {
    overview = await getUserBillingOverview(session.userId);
  } catch {
    overview = null;
  }

  const subscription = overview?.subscription ?? null;
  const benefits = overview?.membershipBenefits ?? { discountPercent: 0, dailyCredits: 0, generationRateLimit: 0 };
  const subscriptionPackages = (overview?.packages ?? []).filter((pkg) => pkg.packageType === "SUBSCRIPTION");
  const channels = (overview?.channels ?? []).map((channel) => ({ provider: channel.provider, label: channel.label }));

  const perks = [
    {
      icon: Percent,
      label: "生成折扣",
      value: benefits.discountPercent > 0 ? `${benefits.discountPercent}% 立减` : "暂无折扣",
      hint: "会员期间生图消耗积分享受折扣",
    },
    {
      icon: Coins,
      label: "每日赠送积分",
      value: benefits.dailyCredits > 0 ? `${benefits.dailyCredits} / 天` : "暂无",
      hint: "每天自动发放，可用于生图",
    },
    {
      icon: Gauge,
      label: "更高生成频率",
      value: benefits.generationRateLimit > 0 ? `${benefits.generationRateLimit} 次 / 分钟` : "标准频率",
      hint: "会员享受更宽松的生成速率上限",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-brand-500 to-brand-600 p-6 text-white shadow-card md:p-8">
        <div className="flex items-center gap-2 text-sm font-bold italic opacity-90">
          <Crown className="h-5 w-5" />
          VIP 会员中心
        </div>
        <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">开通会员，畅享更多创作权益</h1>
        {subscription && subscription.active ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2 text-sm font-semibold backdrop-blur">
            <BadgeCheck className="h-4 w-4" />
            {subscription.packageName} · 有效期至 {formatDate(subscription.expiresAt)}（剩余 {subscription.daysRemaining} 天）
          </p>
        ) : (
          <p className="mt-3 text-sm leading-6 opacity-90">
            你还不是会员，开通后即可享受生成折扣、每日赠送积分与更高生成频率。
          </p>
        )}
      </section>

      <section aria-label="会员权益" className="grid gap-3 sm:grid-cols-3">
        {perks.map((perk) => (
          <div key={perk.label} className="rounded-2xl border border-line bg-panel p-5 shadow-card">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
              <perk.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium text-ink-faint">{perk.label}</p>
            <p className="mt-0.5 text-lg font-extrabold text-ink">{perk.value}</p>
            <p className="mt-1 text-xs leading-5 text-ink-secondary">{perk.hint}</p>
          </div>
        ))}
      </section>

      <section aria-label="会员套餐" className="space-y-3">
        <h2 className="text-lg font-bold text-ink">
          {subscription && subscription.active ? "续费 / 升级会员" : "选择会员套餐"}
        </h2>
        {subscriptionPackages.length ? (
          <MembershipPlans packages={subscriptionPackages} channels={channels} />
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-panel p-8 text-center shadow-card">
            <p className="text-sm font-semibold text-ink-secondary">暂无可开通的会员套餐</p>
            <p className="mt-1 text-xs text-ink-faint">管理员尚未配置会员套餐，请稍后再来查看。</p>
          </div>
        )}
      </section>
    </main>
  );
}
