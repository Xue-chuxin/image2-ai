"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Clock3, CreditCard, ExternalLink, Loader2, QrCode, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

import type { CreditPackageView, RechargeOrderView } from "@/lib/billing";
import type { PaymentChannelView, PaymentProviderName } from "@/lib/payments";

type BillingPayload = {
  ok: boolean;
  order?: RechargeOrderView;
  orders?: RechargeOrderView[];
  balance?: {
    available: number;
    frozen: number;
  };
  error?: string;
};

type ReturnNotice = {
  type: "success" | "failed";
  orderNo: string;
  message: string;
};

type BillingRefreshMode = "auto" | "manual";

const FAST_PAYMENT_CONFIRM_WINDOW_MS = 2 * 60 * 1000;
const FAST_PAYMENT_CONFIRM_INTERVAL_MS = 3 * 1000;
const NORMAL_PAYMENT_CONFIRM_INTERVAL_MS = 10 * 1000;

function formatCurrency(priceCents: number, currency = "CNY") {
  const value = priceCents / 100;
  if (currency === "CNY") {
    return `¥${value.toFixed(2).replace(/\.00$/, "")}`;
  }
  return `${currency} ${value.toFixed(2)}`;
}

function formatTime(value: Date | string) {
  return new Date(value).toLocaleString("zh-CN");
}

function fallbackProviderLabel(provider: string) {
  if (provider === "epay") {
    return "易支付";
  }
  if (provider === "alipay_f2f") {
    return "支付宝当面付";
  }
  if (provider === "wechat_pay") {
    return "微信支付";
  }
  if (provider === "paypal") {
    return "PayPal";
  }
  return provider;
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
  return "待支付";
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

function qrImageUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(value)}`;
}

function isFreshPendingOrder(order: RechargeOrderView) {
  return order.status === "PENDING" && Date.now() - new Date(order.createdAt).getTime() <= FAST_PAYMENT_CONFIRM_WINDOW_MS;
}

function pendingRefreshDelay(orders: RechargeOrderView[]) {
  return orders.some(isFreshPendingOrder) ? FAST_PAYMENT_CONFIRM_INTERVAL_MS : NORMAL_PAYMENT_CONFIRM_INTERVAL_MS;
}

function orderFingerprint(order: RechargeOrderView) {
  return [
    order.id,
    order.status,
    order.paymentUrl || "",
    order.qrCodeUrl || "",
    order.providerTradeNo || "",
    order.notifyPayloadDigest || "",
    order.paidAt || "",
    order.expiresAt || "",
    order.updatedAt,
  ].join("|");
}

function ordersFingerprint(orders: RechargeOrderView[]) {
  return orders.map(orderFingerprint).join("||");
}

function upsertOrder(orders: RechargeOrderView[], nextOrder: RechargeOrderView) {
  const index = orders.findIndex((order) => order.id === nextOrder.id);
  if (index === -1) {
    return [nextOrder, ...orders];
  }
  if (orderFingerprint(orders[index]) === orderFingerprint(nextOrder)) {
    return orders;
  }
  return orders.map((order) => (order.id === nextOrder.id ? nextOrder : order));
}

function upsertOrders(orders: RechargeOrderView[], nextOrders: RechargeOrderView[]) {
  return nextOrders.reduce((current, order) => upsertOrder(current, order), orders);
}

export function AccountBillingPanel({
  balance,
  packages,
  initialOrders,
  channels,
}: {
  balance: {
    available: number;
    frozen: number;
  };
  packages: CreditPackageView[];
  initialOrders: RechargeOrderView[];
  channels: PaymentChannelView[];
}) {
  const availableChannels = useMemo(() => channels.filter((channel) => channel.enabled && channel.configured), [channels]);
  const channelLabelByProvider = useMemo(() => new Map(channels.map((channel) => [channel.provider, channel.label])), [channels]);
  const [currentBalance, setCurrentBalance] = useState(balance);
  const [orders, setOrders] = useState(initialOrders);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderName>(availableChannels[0]?.provider || "epay");
  const [pending, setPending] = useState("");
  const [polling, setPolling] = useState(false);
  const [message, setMessage] = useState("");
  const [returnNotice, setReturnNotice] = useState<ReturnNotice | null>(null);
  const ordersRef = useRef(orders);
  const pollingRef = useRef(false);

  const pendingOrders = useMemo(() => orders.filter((order) => order.status === "PENDING").length, [orders]);
  const activePendingOrder = useMemo(() => orders.find((order) => order.status === "PENDING"), [orders]);
  const selectedChannel = availableChannels.find((channel) => channel.provider === selectedProvider) || availableChannels[0];

  function applyOrders(nextOrders: RechargeOrderView[]) {
    setOrders((current) => (ordersFingerprint(current) === ordersFingerprint(nextOrders) ? current : nextOrders));
  }

  function displayProviderLabel(provider: string) {
    return channelLabelByProvider.get(provider as PaymentProviderName) || fallbackProviderLabel(provider);
  }

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    pollingRef.current = polling;
  }, [polling]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) {
      return;
    }

    const orderNo = params.get("orderNo") || "";
    const rawMessage = params.get("message") || "";
    setReturnNotice({
      type: payment === "success" ? "success" : "failed",
      orderNo,
      message: payment === "success" ? "支付平台已返回成功，系统会继续刷新到账状态。" : rawMessage || "支付未完成或返回处理失败。",
    });
  }, []);

  useEffect(() => {
    if (!selectedChannel) {
      return;
    }
    if (selectedChannel.provider !== selectedProvider) {
      setSelectedProvider(selectedChannel.provider);
    }
  }, [selectedChannel, selectedProvider]);

  useEffect(() => {
    if (pendingOrders === 0) {
      return;
    }

    let stopped = false;
    let timer = 0;
    const scheduleRefresh = () => {
      timer = window.setTimeout(() => {
        void refreshPendingOrders()
          .catch(() => undefined)
          .finally(() => {
            if (!stopped) {
              scheduleRefresh();
            }
          });
      }, pendingRefreshDelay(ordersRef.current));
    };

    scheduleRefresh();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [pendingOrders]);

  useEffect(() => {
    if (pendingOrders === 0) {
      return;
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshPendingOrders();
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [pendingOrders]);

  async function requestJson(url: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set("Cache-Control", "no-cache");
    headers.set("Pragma", "no-cache");
    const response = await fetch(url, {
      ...init,
      headers,
    });
    const payload = (await response.json().catch(() => ({}))) as BillingPayload;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "操作失败");
    }
    return payload;
  }

  async function fetchOrder(orderId: string, mode: BillingRefreshMode = "manual") {
    const params = new URLSearchParams({
      mode,
      _t: String(Date.now()),
    });
    const payload = await requestJson(`/api/billing/orders/${orderId}?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!payload.order) {
      throw new Error("订单状态返回为空");
    }
    return payload.order;
  }

  async function fetchOverview(includeOrderIds: string[] = [], mode: BillingRefreshMode = "auto") {
    const uniqueOrderIds = Array.from(new Set(includeOrderIds.filter(Boolean))).slice(0, 20);
    const params = new URLSearchParams();
    if (uniqueOrderIds.length > 0) {
      params.set("orderIds", uniqueOrderIds.join(","));
    }
    params.set("mode", mode);
    params.set("_t", String(Date.now()));
    const query = params.toString() ? `?${params.toString()}` : "";
    const payload = await requestJson(`/api/billing/overview${query}`, {
      method: "GET",
      cache: "no-store",
    });
    return payload;
  }

  async function refreshOrder(orderId: string, silent = false) {
    if (!silent) {
      setPending(`refresh:${orderId}`);
      setMessage("");
    }

    try {
      const nextOrder = await fetchOrder(orderId, silent ? "auto" : "manual");
      setOrders((current) => upsertOrder(current, nextOrder));
      if (nextOrder.status === "PAID") {
        await refreshOverview(true);
      }
      if (!silent) {
        setMessage(nextOrder.status === "PAID" ? "订单已到账，积分余额已刷新。" : nextOrder.status === "EXPIRED" ? "订单已过期，请重新创建充值订单。" : "订单状态已刷新。");
      }
      return nextOrder;
    } catch (error) {
      if (!silent) {
        setMessage(error instanceof Error ? error.message : "刷新订单状态失败");
      }
      return null;
    } finally {
      if (!silent) {
        setPending("");
      }
    }
  }

  async function refreshPendingOrders(manual = false) {
    const pendingList = ordersRef.current.filter((order) => order.status === "PENDING");
    if (pendingList.length === 0 || pollingRef.current) {
      return;
    }

    pollingRef.current = true;
    if (manual) {
      setPolling(true);
      setMessage("");
    }
    try {
      const pendingIds = new Set(pendingList.map((order) => order.id));
      const payload = await fetchOverview(Array.from(pendingIds), manual ? "manual" : "auto");
      const nextOrders = payload.orders || [];
      const trackedOrders = (
        await Promise.all(
          pendingList.map((order) =>
            fetchOrder(order.id, manual ? "manual" : "auto").catch(() => null),
          ),
        )
      ).filter((order): order is RechargeOrderView => Boolean(order));
      const observedOrders = [...nextOrders, ...trackedOrders];
      const paidOrder = observedOrders.find((order) => pendingIds.has(order.id) && order.status === "PAID");
      const expiredOrder = observedOrders.find((order) => pendingIds.has(order.id) && order.status === "EXPIRED");
      if (payload.balance) {
        setCurrentBalance(payload.balance);
      }
      if (nextOrders.length > 0) {
        applyOrders(nextOrders);
      }
      if (trackedOrders.length > 0) {
        setOrders((current) => upsertOrders(current, trackedOrders));
      }
      if (paidOrder) {
        setMessage("检测到订单已支付，积分余额已刷新。");
        await refreshOverview(true);
      } else if (expiredOrder) {
        setMessage("有待支付订单已过期，如需充值请重新创建订单。");
      }
    } finally {
      pollingRef.current = false;
      if (manual) {
        setPolling(false);
      }
    }
  }

  async function refreshOverview(silent = false) {
    if (!silent) {
      setPolling(true);
      setMessage("");
    }

    try {
      const payload = await fetchOverview(ordersRef.current.map((order) => order.id), silent ? "auto" : "manual");
      if (payload.balance) {
        setCurrentBalance(payload.balance);
      }
      if (payload.orders) {
        applyOrders(payload.orders);
      }
      if (!silent) {
        setMessage("账户余额和订单状态已刷新。");
      }
    } catch (error) {
      if (!silent) {
        setMessage(error instanceof Error ? error.message : "刷新账户概览失败");
      }
    } finally {
      if (!silent) {
        setPolling(false);
      }
    }
  }

  async function createOrder(packageId: string) {
    if (!selectedChannel) {
      setMessage("后台尚未配置可用支付渠道。");
      return;
    }

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
          provider: selectedChannel.provider,
        }),
      });
      if (payload.order) {
        setOrders((current) => [payload.order!, ...current]);
        if (payload.order.paymentUrl && payload.order.provider === "paypal") {
          window.location.href = payload.order.paymentUrl;
          return;
        }
      }
      setMessage("支付订单已创建，请使用订单卡片中的二维码或跳转链接完成支付。系统会自动确认支付结果。");
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
          ["可用积分", currentBalance.available, CheckCircle2],
          ["冻结积分", currentBalance.frozen, Clock3],
          ["待支付订单", pendingOrders, CreditCard],
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

      {returnNotice ? (
        <section className={`rounded-[24px] border p-4 shadow-card backdrop-blur ${returnNotice.type === "success" ? "border-emerald-100 bg-emerald-50/90" : "border-rose-100 bg-rose-50/90"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={`text-xs font-black uppercase tracking-[0.22em] ${returnNotice.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>Payment Return</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{returnNotice.type === "success" ? "支付平台已返回" : "支付返回失败"}</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{returnNotice.message}</p>
              {returnNotice.orderNo ? <p className="mt-1 text-xs font-black text-slate-400">订单号：{returnNotice.orderNo}</p> : null}
            </div>
            <button type="button" onClick={() => void refreshPendingOrders(true)} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
              刷新订单
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-card backdrop-blur">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Online Payment</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">选择在线支付渠道</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">请选择支付方式并完成支付，系统会通过回调和状态查询自动到账。</p>
          </div>
          <div className="min-w-[220px]">
            <label htmlFor="payment-provider" className="sr-only">
              支付方式
            </label>
            <div className="relative">
              <select
                id="payment-provider"
                value={selectedChannel?.provider || ""}
                disabled={availableChannels.length === 0}
                onChange={(event) => setSelectedProvider(event.target.value as PaymentProviderName)}
                className="h-11 w-full appearance-none rounded-full border border-slate-200 bg-white px-4 pr-10 text-sm font-black text-slate-700 shadow-card outline-none transition focus:border-ocean-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                {availableChannels.length === 0 ? <option value="">暂无可用渠道</option> : null}
                {availableChannels.map((channel) => (
                  <option key={channel.provider} value={channel.provider}>
                    {channel.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {activePendingOrder ? (
          <div className="mb-5 rounded-[24px] border border-ocean-100 bg-ocean-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ocean-700 shadow-card">
                  {polling ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-950">正在等待支付到账</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    当前有 {pendingOrders} 个待支付订单，创建后前 2 分钟每 3 秒自动确认一次，之后降低频率。支付完成后如余额未立即变化，请点击刷新。
                  </p>
                  <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-ocean-100 bg-white px-3 py-1 text-xs font-black text-ocean-700">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    正在向支付平台确认支付
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => void refreshPendingOrders(true)} disabled={polling} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${polling ? "animate-spin" : ""}`} />
                刷新待支付
              </button>
            </div>
          </div>
        ) : null}

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
                    disabled={availableChannels.length === 0 || pending === `create:${pkg.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    {pending === `create:${pkg.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    去支付
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {availableChannels.length === 0 ? <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">后台尚未配置可用支付渠道。</p> : null}
      </section>

      {message ? <p className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-bold text-slate-600 shadow-card">{message}</p> : null}

      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-card backdrop-blur">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Orders</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">充值订单</h2>
          </div>
          {pendingOrders > 0 ? (
            <button type="button" onClick={() => void refreshPendingOrders(true)} disabled={polling} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${polling ? "animate-spin" : ""}`} />
              刷新状态
            </button>
          ) : null}
        </div>
        <div className="grid gap-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">{order.orderNo}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">{displayProviderLabel(order.provider)}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-slate-950">{order.packageNameSnapshot}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {order.totalCredits} 积分 · {formatCurrency(order.amountCents, order.currency)} · {formatTime(order.createdAt)}
                  </p>
                  {order.status === "PAID" ? <p className="mt-2 text-xs font-black text-emerald-600">到账时间：{formatTime(order.paidAt || order.updatedAt)}</p> : null}
                </div>
                {order.status === "PENDING" ? (
                  <div className="flex flex-wrap gap-2">
                    {order.paymentUrl ? (
                      <a href={order.paymentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                        <ExternalLink className="h-4 w-4" />
                        打开支付
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void refreshOrder(order.id)}
                      disabled={pending === `refresh:${order.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 disabled:opacity-60"
                    >
                      {pending === `refresh:${order.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      查状态
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelOrder(order.id)}
                      disabled={pending === `cancel:${order.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-600 disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      取消订单
                    </button>
                  </div>
                ) : null}
              </div>

              {order.status === "PENDING" && order.qrCodeUrl ? (
                <div className="mt-4 flex flex-wrap items-center gap-4 rounded-[20px] border border-slate-200 bg-white/80 p-4">
                  <img src={qrImageUrl(order.qrCodeUrl)} alt="支付二维码" className="h-36 w-36 rounded-2xl border border-slate-200 bg-white p-2" />
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-ocean-100 bg-ocean-50 px-3 py-2 text-xs font-black text-ocean-700">
                      <QrCode className="h-4 w-4" />
                      扫码支付
                    </div>
                    <p className="mt-3 max-w-xl break-all text-sm font-bold leading-6 text-slate-500">{order.qrCodeUrl}</p>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        {orders.length === 0 ? <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">暂无充值订单。</p> : null}
      </section>
    </section>
  );
}
