"use client";

import { useState } from "react";
import { Check, Crown, Loader2, Sparkles } from "lucide-react";

type MembershipPackage = {
  id: string;
  name: string;
  description: string | null;
  totalCredits: number;
  priceCents: number;
  currency: string;
  durationDays: number;
};

type PaymentChannel = {
  provider: string;
  label: string;
};

function formatPrice(priceCents: number, currency: string) {
  const value = priceCents / 100;
  if (currency === "CNY") {
    return `¥${value.toFixed(2).replace(/\.00$/, "")}`;
  }
  return `${currency} ${value.toFixed(2)}`;
}

export function MembershipPlans({
  packages,
  channels,
}: {
  packages: MembershipPackage[];
  channels: PaymentChannel[];
}) {
  const [selectedPackageId, setSelectedPackageId] = useState(packages[0]?.id ?? "");
  const [selectedProvider, setSelectedProvider] = useState(channels[0]?.provider ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChannels = channels.length > 0;

  async function handleSubscribe() {
    if (!selectedPackageId || !selectedProvider || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackageId, provider: selectedProvider }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        order?: { paymentUrl?: string | null; qrCodeUrl?: string | null; orderNo?: string };
      };

      if (!response.ok || !data.ok || !data.order) {
        setError(data.error || "创建会员订单失败，请稍后再试。");
        return;
      }

      const { paymentUrl, qrCodeUrl } = data.order;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }
      if (qrCodeUrl) {
        window.open(qrCodeUrl, "_blank", "noopener");
        return;
      }
      // 无跳转链接（如扫码/线下）时，引导用户去控制台完成支付。
      window.location.href = "/console#/account/recharge";
    } catch {
      setError("网络异常，创建会员订单失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => {
          const active = pkg.id === selectedPackageId;
          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => setSelectedPackageId(pkg.id)}
              className={`relative flex flex-col rounded-2xl border p-5 text-left transition ${
                active
                  ? "border-brand-400 bg-brand-50/60 shadow-card ring-2 ring-brand-200"
                  : "border-line bg-panel hover:border-brand-200 hover:bg-page"
              }`}
            >
              {active ? (
                <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : null}
              <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                <Crown className="h-4 w-4 text-amber-500" />
                {pkg.name}
              </span>
              {pkg.description ? (
                <span className="mt-1.5 text-xs leading-5 text-ink-secondary">{pkg.description}</span>
              ) : null}
              <span className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-ink">{formatPrice(pkg.priceCents, pkg.currency)}</span>
                <span className="text-xs font-medium text-ink-faint">/ {pkg.durationDays} 天</span>
              </span>
              <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-lg bg-page px-2.5 py-1 text-xs font-semibold text-brand-600">
                <Sparkles className="h-3.5 w-3.5" />
                赠 {pkg.totalCredits} 积分
              </span>
            </button>
          );
        })}
      </div>

      {hasChannels ? (
        <div className="space-y-2.5 rounded-2xl border border-line bg-panel p-5 shadow-card">
          <p className="text-sm font-bold text-ink">支付方式</p>
          <div className="flex flex-wrap gap-2">
            {channels.map((channel) => {
              const active = channel.provider === selectedProvider;
              return (
                <button
                  key={channel.provider}
                  type="button"
                  onClick={() => setSelectedProvider(channel.provider)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-brand-400 bg-brand-50 text-brand-600"
                      : "border-line bg-page text-ink-secondary hover:border-brand-200"
                  }`}
                >
                  {active ? <Check className="h-3.5 w-3.5" /> : null}
                  {channel.label}
                </button>
              );
            })}
          </div>

          {error ? (
            <p className="rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-300">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading || !selectedPackageId || !selectedProvider}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-chip transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
            立即开通会员
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-panel p-5 text-center shadow-card">
          <p className="text-sm font-semibold text-ink-secondary">在线支付渠道暂未开启</p>
          <p className="mt-1 text-xs text-ink-faint">
            请前往
            <a href="/console#/account/recharge" className="mx-1 font-semibold text-brand-600 hover:underline">
              充值中心
            </a>
            了解可用的开通方式。
          </p>
        </div>
      )}
    </section>
  );
}
