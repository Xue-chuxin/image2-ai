"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, CreditCard, Loader2, QrCode, ReceiptText, UploadCloud, XCircle } from "lucide-react";
import type { BillingPaymentSettings, CreditPackageView, RechargeOrderView } from "@/lib/billing";

type BillingPayload = {
  ok: boolean;
  order?: RechargeOrderView;
  error?: string;
};

type ProofForm = {
  paymentMethod: string;
  paymentNote: string;
  file: File | null;
};

function formatCurrency(priceCents: number, currency = "CNY") {
  const value = priceCents / 100;
  if (currency === "CNY") {
    return `¥${value.toFixed(2).replace(/\.00$/, "")}`;
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

function defaultProofForm(): ProofForm {
  return {
    paymentMethod: "wechat",
    paymentNote: "",
    file: null,
  };
}

export function AccountBillingPanel({
  balance,
  packages,
  initialOrders,
  paymentSettings,
}: {
  balance: {
    available: number;
    frozen: number;
  };
  packages: CreditPackageView[];
  initialOrders: RechargeOrderView[];
  paymentSettings: BillingPaymentSettings;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [proofForms, setProofForms] = useState<Record<string, ProofForm>>({});
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");

  const pendingOrders = useMemo(() => orders.filter((order) => order.status === "PENDING").length, [orders]);

  function getProofForm(orderId: string) {
    return proofForms[orderId] || defaultProofForm();
  }

  function updateProofForm(orderId: string, patch: Partial<ProofForm>) {
    setProofForms((current) => ({
      ...current,
      [orderId]: {
        ...defaultProofForm(),
        ...(current[orderId] || {}),
        ...patch,
      },
    }));
  }

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
      setMessage("充值订单已创建。请按收款信息完成支付，并在订单中上传付款截图。");
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

  async function submitProof(orderId: string) {
    const proofForm = getProofForm(orderId);
    if (!proofForm.file) {
      setMessage("请先选择付款截图。");
      return;
    }

    setPending(`proof:${orderId}`);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", proofForm.file);
      formData.append("paymentMethod", proofForm.paymentMethod);
      formData.append("paymentNote", proofForm.paymentNote);
      const payload = await requestJson(`/api/billing/orders/${orderId}/proof`, {
        method: "POST",
        body: formData,
      });
      if (payload.order) {
        setOrders((current) => current.map((order) => (order.id === orderId ? payload.order! : order)));
      }
      setMessage("付款凭证已提交，管理员确认到账后积分会自动发放。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交付款凭证失败");
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

      <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-card backdrop-blur">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Plans</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">积分套餐</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">创建订单后上传付款凭证，后台确认到账后积分自动发放。</p>
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
                      disabled={!paymentSettings.paymentEnabled || pending === `create:${pkg.id}`}
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
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-card backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Payment</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{paymentSettings.paymentTitle}</h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ocean-50 text-ocean-800">
              <QrCode className="h-5 w-5" />
            </div>
          </div>
          {paymentSettings.paymentEnabled ? (
            <div className="mt-5 space-y-4">
              {paymentSettings.paymentQrUrl ? (
                <img src={paymentSettings.paymentQrUrl} alt="收款二维码" className="aspect-square w-full rounded-[24px] border border-slate-200 bg-slate-50 object-cover p-2" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 text-center text-sm font-bold text-slate-400">
                  后台尚未配置收款二维码
                </div>
              )}
              <div className="space-y-2 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 text-sm font-bold text-slate-600">
                {paymentSettings.paymentReceiverName ? <p>收款方：{paymentSettings.paymentReceiverName}</p> : null}
                {paymentSettings.paymentReceiverAccount ? <p>账号：{paymentSettings.paymentReceiverAccount}</p> : null}
                <p className="leading-6 text-slate-500">{paymentSettings.paymentInstructions}</p>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-[22px] border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-700">充值通道暂未开启，请稍后再试。</p>
          )}
        </aside>
      </section>

      {message ? <p className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-bold text-slate-600 shadow-card">{message}</p> : null}

      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-card backdrop-blur">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Orders</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">充值订单</h2>
        </div>
        <div className="grid gap-3">
          {orders.map((order) => {
            const proofForm = getProofForm(order.id);
            return (
              <article key={order.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">{order.orderNo}</span>
                      {order.submittedAt ? <span className="rounded-full border border-ocean-100 bg-ocean-50 px-3 py-1 text-xs font-black text-ocean-700">已提交凭证</span> : null}
                    </div>
                    <h3 className="mt-3 text-lg font-black text-slate-950">{order.packageNameSnapshot}</h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {order.totalCredits} 积分 · {formatCurrency(order.amountCents, order.currency)} · {new Date(order.createdAt).toLocaleString("zh-CN")}
                    </p>
                    {order.paymentProofUrl ? (
                      <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full border border-ocean-100 bg-white px-3 py-2 text-xs font-black text-ocean-700">
                        <ReceiptText className="h-4 w-4" />
                        查看已提交凭证
                      </a>
                    ) : null}
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

                {order.status === "PENDING" ? (
                  <div className="mt-4 grid gap-3 rounded-[20px] border border-slate-200 bg-white/80 p-4 lg:grid-cols-[140px_1fr_1fr_auto] lg:items-end">
                    <label className="block">
                      <span className="text-xs font-black text-slate-500">支付方式</span>
                      <select
                        value={proofForm.paymentMethod}
                        onChange={(event) => updateProofForm(order.id, { paymentMethod: event.target.value })}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 outline-none"
                      >
                        <option value="wechat">微信</option>
                        <option value="alipay">支付宝</option>
                        <option value="bank">银行卡</option>
                        <option value="other">其他</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-black text-slate-500">付款备注</span>
                      <input
                        value={proofForm.paymentNote}
                        onChange={(event) => updateProofForm(order.id, { paymentNote: event.target.value })}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 outline-none"
                        placeholder="可填转账时间、实名或备注"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-black text-slate-500">付款截图</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => updateProofForm(order.id, { file: event.target.files?.[0] || null })}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => submitProof(order.id)}
                      disabled={pending === `proof:${order.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                    >
                      {pending === `proof:${order.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                      提交凭证
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        {orders.length === 0 ? <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">暂无充值订单。</p> : null}
      </section>
    </section>
  );
}
