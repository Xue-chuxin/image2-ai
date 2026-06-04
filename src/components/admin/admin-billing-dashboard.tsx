"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Edit3, Loader2, Plus, Search } from "lucide-react";
import type { CreditPackageView, RechargeOrderView } from "@/lib/billing";

type BillingPayload = {
  ok: boolean;
  packages?: CreditPackageView[];
  package?: CreditPackageView;
  orders?: RechargeOrderView[];
  order?: RechargeOrderView;
  error?: string;
};

const statusOptions = [
  ["all", "全部"],
  ["PENDING", "待确认"],
  ["PAID", "已到账"],
  ["CANCELED", "已取消"],
  ["EXPIRED", "已过期"],
];

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

function emptyForm() {
  return {
    id: "",
    name: "",
    description: "",
    credits: "100",
    bonusCredits: "0",
    priceYuan: "9.9",
    sortOrder: "0",
    isActive: true,
  };
}

export function AdminBillingDashboard({
  initialPackages,
  initialOrders,
}: {
  initialPackages: CreditPackageView[];
  initialOrders: RechargeOrderView[];
}) {
  const [packages, setPackages] = useState(initialPackages);
  const [orders, setOrders] = useState(initialOrders);
  const [form, setForm] = useState(emptyForm());
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");

  const stats = useMemo(
    () => ({
      packages: packages.length,
      activePackages: packages.filter((pkg) => pkg.isActive).length,
      pendingOrders: orders.filter((order) => order.status === "PENDING").length,
      paidAmount: orders.filter((order) => order.status === "PAID").reduce((sum, order) => sum + order.amountCents, 0),
    }),
    [orders, packages],
  );

  async function requestJson(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const payload = (await response.json().catch(() => ({}))) as BillingPayload;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "操作失败");
    }
    return payload;
  }

  async function savePackage(nextForm = form) {
    setPending("save-package");
    setMessage("");
    try {
      const payload = await requestJson("/api/admin/billing/packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: nextForm.id || undefined,
          name: nextForm.name,
          description: nextForm.description,
          credits: Number(nextForm.credits),
          bonusCredits: Number(nextForm.bonusCredits),
          priceYuan: Number(nextForm.priceYuan),
          sortOrder: Number(nextForm.sortOrder),
          isActive: nextForm.isActive,
        }),
      });

      if (payload.package) {
        setPackages((current) => {
          const exists = current.some((pkg) => pkg.id === payload.package!.id);
          if (exists) {
            return current.map((pkg) => (pkg.id === payload.package!.id ? payload.package! : pkg));
          }
          return [...current, payload.package!].sort((a, b) => a.sortOrder - b.sortOrder);
        });
      }
      setForm(emptyForm());
      setMessage("套餐已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存套餐失败");
    } finally {
      setPending("");
    }
  }

  function editPackage(pkg: CreditPackageView) {
    setForm({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description || "",
      credits: String(pkg.credits),
      bonusCredits: String(pkg.bonusCredits),
      priceYuan: String(pkg.priceCents / 100),
      sortOrder: String(pkg.sortOrder),
      isActive: pkg.isActive,
    });
  }

  async function togglePackage(pkg: CreditPackageView) {
    await savePackage({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description || "",
      credits: String(pkg.credits),
      bonusCredits: String(pkg.bonusCredits),
      priceYuan: String(pkg.priceCents / 100),
      sortOrder: String(pkg.sortOrder),
      isActive: !pkg.isActive,
    });
  }

  async function loadOrders(nextStatus = status, nextQuery = query) {
    setPending("load-orders");
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (nextStatus !== "all") {
        params.set("status", nextStatus);
      }
      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }
      const payload = await requestJson(`/api/admin/billing/orders?${params.toString()}`);
      setOrders(payload.orders || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "刷新订单失败");
    } finally {
      setPending("");
    }
  }

  async function markPaid(orderId: string) {
    setPending(`paid:${orderId}`);
    setMessage("");
    try {
      const payload = await requestJson(`/api/admin/billing/orders/${orderId}/mark-paid`, {
        method: "POST",
      });
      if (payload.order) {
        setOrders((current) => current.map((order) => (order.id === orderId ? payload.order! : order)));
      }
      setMessage("订单已确认到账，积分已发放。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "确认到账失败");
    } finally {
      setPending("");
    }
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["套餐", stats.packages],
          ["上架", stats.activePackages],
          ["待确认", stats.pendingOrders],
          ["已到账金额", formatCurrency(stats.paidAmount)],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-[22px] border border-slate-200 bg-white/88 p-4 shadow-card backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label as string}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value as string | number}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-card backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Package</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{form.id ? "编辑套餐" : "新增套餐"}</h2>
            </div>
            <button type="button" onClick={() => setForm(emptyForm())} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
              清空
            </button>
          </div>
          <div className="space-y-3">
            {[
              ["name", "套餐名称", "入门包"],
              ["description", "描述", "适合轻量体验"],
              ["credits", "基础积分", "100"],
              ["bonusCredits", "赠送积分", "0"],
              ["priceYuan", "价格（元）", "9.9"],
              ["sortOrder", "排序", "10"],
            ].map(([key, label, placeholder]) => (
              <label key={key} className="block">
                <span className="text-sm font-bold text-slate-700">{label}</span>
                <input
                  value={form[key as keyof typeof form] as string}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-ocean-300"
                  placeholder={placeholder}
                />
              </label>
            ))}
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
              上架套餐
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            </label>
            <button type="button" onClick={() => savePackage()} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              {pending === "save-package" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              保存套餐
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-card backdrop-blur">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Packages</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">套餐列表</h2>
          </div>
          <div className="grid gap-3">
            {packages.map((pkg) => (
              <article key={pkg.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${pkg.isActive ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-white text-slate-500"}`}>
                        {pkg.isActive ? "已上架" : "已下架"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">排序 {pkg.sortOrder}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-black text-slate-950">{pkg.name}</h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {pkg.totalCredits} 积分 · {formatCurrency(pkg.priceCents, pkg.currency)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => editPackage(pkg)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
                      <Edit3 className="h-4 w-4" />
                      编辑
                    </button>
                    <button type="button" onClick={() => togglePackage(pkg)} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                      {pkg.isActive ? "下架" : "上架"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-card backdrop-blur">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Orders</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">充值订单</h2>
          </div>
          <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {statusOptions.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setStatus(value);
                    void loadOrders(value, query);
                  }}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black ${status === value ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:min-w-80">
              <Search className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void loadOrders(status, query);
                  }
                }}
                className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                placeholder="订单号、邮箱、套餐"
              />
            </label>
            <button type="button" onClick={() => loadOrders(status, query)} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              搜索
            </button>
          </div>
        </div>

        {message ? <p className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{message}</p> : null}

        <div className="grid gap-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">{order.orderNo}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">{order.userEmail || order.userId}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-slate-950">{order.packageNameSnapshot}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {order.totalCredits} 积分 · {formatCurrency(order.amountCents, order.currency)} · {new Date(order.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                {order.status === "PENDING" ? (
                  <button
                    type="button"
                    disabled={pending === `paid:${order.id}`}
                    onClick={() => markPaid(order.id)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    {pending === `paid:${order.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    人工确认到账
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {orders.length === 0 ? <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">暂无订单。</p> : null}
      </section>
    </section>
  );
}
