"use client";

import { useState } from "react";
import { Loader2, LockKeyhole, Mail } from "lucide-react";

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
    error: text.includes("<!DOCTYPE") ? "接口返回了 HTML 错误页，请查看服务端日志。" : text || "接口返回格式异常。"
  };
}

export function AdminSignInForm({ nextPath = "/admin/settings" }: { nextPath?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await readApiResponse(response);

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "登录失败。");
      }

      window.location.href = nextPath;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "登录失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-bold text-slate-700">管理员邮箱</span>
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-ocean-100 bg-ocean-50/60 px-4 py-3">
          <Mail className="h-4 w-4 text-ocean-700" />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="admin@example.com"
            type="email"
          />
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-bold text-slate-700">管理员密码</span>
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-ocean-100 bg-ocean-50/60 px-4 py-3">
          <LockKeyhole className="h-4 w-4 text-ocean-700" />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="请输入密码"
            type="password"
          />
        </div>
      </label>
      {error ? <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p> : null}
      <button
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ocean-800 px-4 py-3 text-sm font-black text-white shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
        {isSubmitting ? "登录中" : "进入后台"}
      </button>
    </form>
  );
}
