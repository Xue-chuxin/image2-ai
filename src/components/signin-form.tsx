"use client";

import { useState } from "react";
import clsx from "clsx";
import { Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";

type SignInMode = "user" | "admin";

type ApiResponse = {
  ok: boolean;
  error?: string;
};

async function readApiResponse(response: Response): Promise<ApiResponse> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as ApiResponse;
  }

  const text = await response.text();
  return {
    ok: false,
    error: text.includes("<!DOCTYPE") ? "接口返回了 HTML 错误页，请查看服务端日志。" : text || "接口返回格式异常。",
  };
}

export function SignInForm({
  nextPath = "/generate",
  initialMode = "user",
}: {
  nextPath?: string;
  initialMode?: SignInMode;
}) {
  const [mode, setMode] = useState<SignInMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(mode === "admin" ? "/api/auth/admin-login" : "/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });
      const data = await readApiResponse(response);

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "登录失败。");
      }

      setMessage(mode === "admin" ? "管理员登录成功，正在进入后台。" : "登录成功，正在进入创作页。");
      window.location.href = mode === "admin" ? nextPath || "/admin/settings" : nextPath || "/generate";
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "登录失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white/72 p-1">
        <button
          type="button"
          onClick={() => setMode("user")}
          className={clsx(
            "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition",
            mode === "user" ? "bg-slate-950 text-white shadow-card" : "text-slate-500 hover:bg-slate-50",
          )}
        >
          <UserRound className="h-4 w-4" />
          普通用户
        </button>
        <button
          type="button"
          onClick={() => setMode("admin")}
          className={clsx(
            "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition",
            mode === "admin" ? "bg-slate-950 text-white shadow-card" : "text-slate-500 hover:bg-slate-50",
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          管理员
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="text-sm font-bold text-slate-700">{mode === "admin" ? "管理员邮箱" : "用户邮箱"}</span>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-ocean-100 bg-ocean-50/60 px-4 py-3">
            <Mail className="h-4 w-4 text-ocean-700" />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="name@example.com"
              type="email"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">{mode === "admin" ? "管理员密码" : "登录密码"}</span>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-ocean-100 bg-ocean-50/60 px-4 py-3">
            <LockKeyhole className="h-4 w-4 text-ocean-700" />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder={mode === "user" ? "首次登录会自动注册" : "请输入管理员密码"}
              type="password"
            />
          </div>
        </label>

        {message ? (
          <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </p>
        ) : null}
        {error ? <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p> : null}

        <button
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ocean-800 px-4 py-3 text-sm font-black text-white shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
          {isSubmitting ? "登录中" : mode === "admin" ? "进入后台" : "登录 / 注册"}
        </button>
      </form>
    </div>
  );
}
