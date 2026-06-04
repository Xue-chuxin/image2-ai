"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, CreditCard, Loader2, XCircle } from "lucide-react";
import type { CreditPackageView, RechargeOrderView } from "@/lib/billing";

type BillingPayload = {
  ok: boolean;
  order?: RechargeOrderView;
  error?: string;
};

function formatCurrency(priceCents: number, currency = "CNY") {
  const value = priceCents / 100;
  if (currency === "CNY") {
    return `￥${value.toFixed(2).replace(/\.00$/, "")}`;
  }
  return `${currency} ${value.toFixed(2)}`;
}

function statusLabel(status: string) {
  if (status === "PAID") {
    return "已到账";
  }
  if (status === "CANCELED") {
    return "已取消";
  }
  if (status === "EXPIRED") {
    return "已过期";
  }
  return "待确认";
}

function statusClass(status: string) {
  if (status === "PAID") {
    return "border-emerald-100 bg-emerald-50 text-emerald-600";
  }
  if (status === "CANCELED" || status === "EXPIRED") {
    return "border-rose-100 bg-rose-50 text-rose-600";
  }
  return "border-amber-100 bg-amber-50 text-amber-600";
}

export function AccountBillingPanel({
  balance,
  packages,
  initialOrders,
}: {
  balance: {
    available: number;
    frozen: number;
  };
  packages: CreditPackageView[];
  initialOrders: RechargeOrderView[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");

  const pendingOrders = useMemo(() => orders.filter((order) => order.status === "PENDING").length, [orders]);

  async function requestJson(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const payload = (await response.json().catch(() => ({}))) as BillingPayload;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "操作失败");
    }
    return payload;
  }

  async function createOrder(packageId: string) {
    setPending(`create:${packageId}`);
    setMessage("");
    try {
      const payload = await requestJson("/api/billing/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId,
        }),
      });
      if (payload.order) {
        setOrders((current) => [payload.order!, ...current]);
      }
      setMessage("充值订单已创建。当前阶段先由后台人工确认到账，支付系统会在下一阶段接入。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建订单失败");
    } finally {
      setPending("");
    }
  }

  async function cancelOrder(orderId: string) {
    setPending(`cancel:${orderId}`);
    setMessage("");
    try {
      const payload = await requestJson(`/api/billing/orders/${orderId}/cancel`, {
        method: "POST",
      });
      if (payload.order) {
        setOrders((current) => current.map((order) => (order.id === orderId ? payload.order! : order)));
      }
      setMessage("订单已取消。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取消订单失败");
    } finally {
      setPending("");
    }
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["可用积分", balance.available, CheckCircle2],
          ["冻结积分", balance.frozen, Clock3],
          ["待确认订单", pendingOrders, CreditCard],
        ].map(([label, value, Icon]) => {
          const TypedIcon = Icon as typeof CheckCircle2;
          return (
            <div key={label as string} className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-card backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label as string}</p>
                <TypedIcon className="h-5 w-5 text-ocean-700" />
              </div>
              <p className="mt-3 text-4xl font-black text-slate-950">{value as number}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-card backdrop-blur">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Plans</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">积分套餐</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">阶段 9A 先创建充值订单，由后台人工确认后积分到账。</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {packages.map((pkg) => (
            <article key={pkg.id} className="relative overflow-hidden rounded-[26px] border border-ocean-100 bg-gradient-to-br from-white via-ocean-50/60 to-slate-50 p-5 shadow-card">
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-ocean-100 blur-3xl" />
              <div className="relative space-y-4">
                <div>
                  <h3 className="text-xl font-black text-slate-950">{pkg.name}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{pkg.description}</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-slate-950">{pkg.totalCredits}</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {pkg.credits} 基础积分{pkg.bonusCredits ? ` + ${pkg.bonusCredits} 赠送` : ""}
                  </p>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <p className="text-2xl font-black text-ocean-800">{formatCurrency(pkg.priceCents, pkg.currency)}</p>
                  <button
                    type="button"
                    onClick={() => createOrder(pkg.id)}
                    disabled={pending === `create:${pkg.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    {pending === `create:${pkg.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    创建订单
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {message ? <p className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-bold text-slate-600 shadow-card">{message}</p> : null}

      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-card backdrop-blur">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Orders</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">充值订单</h2>
        </div>
        <div className="grid gap-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">{order.orderNo}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-slate-950">{order.packageNameSnapshot}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {order.totalCredits} 积分 · {formatCurrency(order.amountCents, order.currency)} · {new Date(order.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                {order.status === "PENDING" ? (
                  <button
                    type="button"
                    onClick={() => cancelOrder(order.id)}
                    disabled={pending === `cancel:${order.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-600 disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    取消订单
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {orders.length === 0 ? <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">暂无充值订单。</p> : null}
      </section>
    </section>
  );
}
