import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Coins, LockKeyhole, Receipt, Snowflake } from "lucide-react";

import { getUserSession } from "@/lib/auth";
import {
  getCreditTransactionLabel,
  getUserCreditBalance,
  listUserCreditTransactions,
  summarizeCreditTransactions,
  type CreditTransactionView,
} from "@/lib/credits";

export const dynamic = "force-dynamic";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getTypeBadgeClass(type: string) {
  if (type === "PURCHASE" || type === "GRANT" || type === "REFUND") {
    return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }
  if (type === "SPEND") {
    return "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-300";
  }
  if (type === "FREEZE") {
    return "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300";
  }
  return "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-ink-faint";
}

function formatAmount(amount: number) {
  return amount > 0 ? `+${amount}` : `${amount}`;
}

export default async function CreditsPage() {
  const session = await getUserSession();

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-[1200px]">
        <div className="flex justify-center py-10 md:py-16">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <LockKeyhole className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-lg font-bold text-ink">请先登录</h1>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">积分明细已按账号隔离，登录后只会看到你自己的余额与流水记录。</p>
            <Link
              href="/signin?next=/credits"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
            >
              去登录
            </Link>
          </div>
        </div>
      </main>
    );
  }

  let available = 0;
  let frozen = 0;
  let transactions: CreditTransactionView[] = [];

  try {
    const [balance, rows] = await Promise.all([
      getUserCreditBalance(session.userId),
      listUserCreditTransactions(session.userId, 100),
    ]);
    available = balance.available;
    frozen = balance.frozen;
    transactions = rows;
  } catch {
    // 数据库暂不可用时渲染空态。
  }

  const summary = summarizeCreditTransactions(transactions);

  const stats = [
    { label: "可用积分", value: available, icon: Coins, valueClass: "text-ink" },
    { label: "冻结中", value: frozen, icon: Snowflake, valueClass: "text-sky-600 dark:text-sky-300" },
    { label: "累计入账", value: summary.totalIn, icon: ArrowDownLeft, valueClass: "text-emerald-600 dark:text-emerald-300" },
    { label: "累计出账", value: summary.totalOut, icon: ArrowUpRight, valueClass: "text-rose-500 dark:text-rose-300" },
  ];

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">积分明细</h1>
          <p className="mt-0.5 text-xs text-ink-faint">查看积分余额与全部收支流水（充值、赠送、消费、冻结与返还）。</p>
        </div>
        <a
          href="/console#/account/recharge"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
        >
          <Coins className="h-3.5 w-3.5" />
          去充值
        </a>
      </section>

      <section aria-label="积分概览" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-line bg-panel px-4 py-3.5 shadow-card">
              <div className="flex items-center gap-1.5 text-ink-faint">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
              <p className={`mt-1.5 text-2xl font-extrabold leading-tight ${item.valueClass}`}>{item.value}</p>
            </div>
          );
        })}
      </section>

      {transactions.length ? (
        <section aria-label="流水列表" className="overflow-hidden rounded-2xl border border-line bg-panel shadow-card">
          <div className="hidden grid-cols-[110px_1fr_120px_120px] gap-3 border-b border-line px-5 py-3 text-xs font-semibold text-ink-faint md:grid">
            <span>类型</span>
            <span>说明</span>
            <span className="text-right">变动</span>
            <span className="text-right">结余</span>
          </div>
          <ul className="divide-y divide-line">
            {transactions.map((tx) => (
              <li key={tx.id} className="grid grid-cols-2 gap-2 px-5 py-3.5 md:grid-cols-[110px_1fr_120px_120px] md:items-center md:gap-3">
                <span className={`inline-flex w-fit items-center rounded-lg px-2.5 py-1 text-xs font-bold ${getTypeBadgeClass(tx.type)}`}>
                  {getCreditTransactionLabel(tx.type)}
                </span>
                <div className="min-w-0 md:order-none order-3 col-span-2 md:col-span-1">
                  <p className="truncate text-sm text-ink-secondary">{tx.memo ?? "-"}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">{formatTime(tx.createdAt)}</p>
                </div>
                <span
                  className={`text-right text-sm font-bold tabular-nums ${
                    tx.amount > 0 ? "text-emerald-600 dark:text-emerald-300" : tx.amount < 0 ? "text-rose-500 dark:text-rose-300" : "text-ink-secondary"
                  }`}
                >
                  {formatAmount(tx.amount)}
                </span>
                <span className="text-right text-sm font-semibold tabular-nums text-ink-faint">{tx.balance}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="flex justify-center py-10 md:py-16">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <Receipt className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-ink">暂无积分流水</h2>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">充值、每日签到或开始创作后，收支记录会显示在这里。</p>
            <Link
              href="/generate"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
            >
              去创作
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
