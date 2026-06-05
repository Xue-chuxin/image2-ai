"use client";

import { useState } from "react";
import { Coins, Loader2, RefreshCw, Search, ShieldAlert, UserRound } from "lucide-react";

import type { AdminUserView } from "@/lib/admin-users";

type UsersResponse = {
  ok: boolean;
  users?: AdminUserView[];
  user?: AdminUserView;
  error?: string;
};

function formatTime(value: string | null) {
  if (!value) {
    return "暂无";
  }
  return new Date(value).toLocaleString("zh-CN");
}

function roleLabel(role: string) {
  return role === "ADMIN" ? "管理员" : "普通用户";
}

async function readResponse(response: Response): Promise<UsersResponse> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as UsersResponse;
  }

  const text = await response.text();
  return {
    ok: false,
    error: text.includes("<!DOCTYPE") ? "接口返回了 HTML 错误页，请查看服务端日志。" : text || "接口返回格式异常。",
  };
}

export function AdminUsersDashboard({ initialUsers }: { initialUsers: AdminUserView[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshUsers(nextQuery = query) {
    setPending("search");
    setMessage("");
    setError("");

    try {
      const params = new URLSearchParams();
      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }
      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await readResponse(response);

      if (!response.ok || !data.ok || !data.users) {
        throw new Error(data.error || "读取用户列表失败。");
      }

      setUsers(data.users);
      setMessage("用户列表已刷新。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "读取用户列表失败。");
    } finally {
      setPending("");
    }
  }

  async function adjustCredits(userId: string) {
    const amount = Number(amounts[userId]);
    const reason = reasons[userId] || "";
    setPending(`credits:${userId}`);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          reason,
        }),
      });
      const data = await readResponse(response);

      if (!response.ok || !data.ok || !data.user) {
        throw new Error(data.error || "调整积分失败。");
      }

      setUsers((current) => current.map((user) => (user.id === userId ? data.user! : user)));
      setAmounts((current) => ({ ...current, [userId]: "" }));
      setReasons((current) => ({ ...current, [userId]: "" }));
      setMessage("积分已调整，并已写入积分流水。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "调整积分失败。");
    } finally {
      setPending("");
    }
  }

  return (
    <section className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">User Ops</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">用户运营</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">搜索用户、查看积分和业务统计，并进行手动积分调整。</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <label className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void refreshUsers();
                  }
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-ocean-400"
                placeholder="搜索邮箱、昵称或用户 ID"
              />
            </label>
            <button
              type="button"
              onClick={() => void refreshUsers()}
              disabled={pending === "search"}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-card disabled:opacity-60"
            >
              {pending === "search" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              刷新
            </button>
          </div>
        </div>
        {message ? <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p> : null}
      </section>

      <section className="grid gap-4">
        {users.map((user) => (
          <article key={user.id} className="rounded-[30px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ocean-50 text-ocean-700 shadow-card">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-black text-slate-950">{user.email || user.displayName || user.id}</h3>
                      <p className="mt-1 break-all text-xs font-bold text-slate-400">{user.id}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${user.role === "ADMIN" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
                    {roleLabel(user.role)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["可用积分", user.availableCredits],
                    ["冻结积分", user.frozenCredits],
                    ["生成任务", user.generationJobCount],
                    ["充值订单", user.rechargeOrderCount],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label as string}</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{value as number}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">已支付订单：{user.paidRechargeOrderCount}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">上传图片：{user.uploadedImageCount}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">注册：{formatTime(user.createdAt)}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">最近登录：{formatTime(user.lastLoginAt)}</span>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-ocean-700" />
                  <h4 className="font-black text-slate-950">手动调整积分</h4>
                </div>
                <p className="mt-2 text-xs font-bold leading-5 text-slate-500">正数增加积分，负数扣减积分。扣减不会允许可用积分变成负数。</p>
                {user.role !== "USER" ? (
                  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700">
                    <div className="flex items-center gap-2 font-black">
                      <ShieldAlert className="h-4 w-4" />
                      管理员账号不可调整积分
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    <input
                      value={amounts[user.id] || ""}
                      onChange={(event) => setAmounts((current) => ({ ...current, [user.id]: event.target.value }))}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-ocean-400"
                      placeholder="例如 100 或 -20"
                      type="number"
                    />
                    <input
                      value={reasons[user.id] || ""}
                      onChange={(event) => setReasons((current) => ({ ...current, [user.id]: event.target.value }))}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-ocean-400"
                      placeholder="调整原因"
                    />
                    <button
                      type="button"
                      onClick={() => void adjustCredits(user.id)}
                      disabled={pending === `credits:${user.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-card disabled:opacity-60"
                    >
                      {pending === `credits:${user.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                      确认调整
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      {users.length === 0 ? <p className="rounded-[24px] border border-dashed border-slate-200 bg-white/80 px-5 py-8 text-center text-sm font-bold text-slate-500">没有找到匹配用户。</p> : null}
    </section>
  );
}
