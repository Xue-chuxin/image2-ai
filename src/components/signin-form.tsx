"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

type UserAuthMode = "login" | "register";

type ApiResponse = {
  ok: boolean;
  message?: string;
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
  mode = "login",
}: {
  nextPath?: string;
  mode?: UserAuthMode;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [oauthProviders, setOauthProviders] = useState<Array<{ provider: string; label: string }>>([]);
  const isRegister = mode === "register";
  const switchHref = `${isRegister ? "/signin" : "/signup"}${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;

  useEffect(() => {
    // 展示后台已开放的第三方登录入口。
    fetch("/api/auth/oauth/providers")
      .then((response) => response.json())
      .then((data: { ok?: boolean; providers?: Array<{ provider: string; label: string }> }) => {
        if (data?.providers?.length) {
          setOauthProviders(data.providers);
        }
      })
      .catch(() => undefined);

    // 回显 OAuth 回调错误。
    try {
      const oauthError = new URLSearchParams(window.location.search).get("oauth_error");
      if (oauthError) {
        setError(oauthError);
      }
    } catch {
      // 忽略。
    }
  }, []);

  useEffect(() => {
    if (codeCooldown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCodeCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [codeCooldown]);

  async function sendVerificationCode() {
    setError("");
    setMessage("");
    setIsSendingCode(true);

    try {
      const response = await fetch("/api/auth/email-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          purpose: "register",
        }),
      });
      const data = await readApiResponse(response);

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "验证码发送失败。");
      }

      setMessage(data.message || "验证码已发送，请查收邮箱。");
      setCodeCooldown(60);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "验证码发送失败。");
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          intent: mode,
          verificationCode: isRegister ? verificationCode : undefined,
        }),
      });
      const data = await readApiResponse(response);

      if (!response.ok || !data.ok) {
        throw new Error(data.error || (isRegister ? "注册失败。" : "登录失败。"));
      }

      setMessage(isRegister ? "注册成功，正在进入创作页。" : "登录成功，正在进入创作页。");
      window.location.href = nextPath || "/generate";
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : isRegister ? "注册失败。" : "登录失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold text-ink-secondary">用户邮箱</span>
        <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-line bg-page/60 px-3.5 py-2.5 transition focus-within:border-brand-400 focus-within:bg-panel focus-within:ring-2 focus-within:ring-brand-100">
          <Mail size={15} className="shrink-0 text-ink-faint" />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
            placeholder="name@example.com"
            type="email"
            name="email"
            autoComplete="email"
          />
        </div>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-ink-secondary">{isRegister ? "设置密码" : "登录密码"}</span>
        <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-line bg-page/60 px-3.5 py-2.5 transition focus-within:border-brand-400 focus-within:bg-panel focus-within:ring-2 focus-within:ring-brand-100">
          <LockKeyhole size={15} className="shrink-0 text-ink-faint" />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
            placeholder={isRegister ? "至少 6 位，用于后续登录" : "请输入登录密码"}
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </div>
      </label>

      {isRegister ? (
        <div className="block">
          <span className="text-sm font-semibold text-ink-secondary">注册验证码</span>
          <div className="mt-1.5 flex items-stretch gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-page/60 px-3.5 py-2.5 transition focus-within:border-brand-400 focus-within:bg-panel focus-within:ring-2 focus-within:ring-brand-100">
              <ShieldCheck size={15} className="shrink-0 text-ink-faint" />
              <input
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                placeholder="6 位验证码"
                inputMode="numeric"
                maxLength={6}
              />
            </div>
            <button
              type="button"
              onClick={() => void sendVerificationCode()}
              disabled={isSendingCode || isSubmitting || codeCooldown > 0 || !email.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-ink-secondary transition hover:bg-page disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSendingCode ? <Loader2 size={15} className="animate-spin" /> : null}
              {isSendingCode ? "发送中" : codeCooldown > 0 ? `${codeCooldown} 秒后重发` : "发送验证码"}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-ink-faint">新用户注册需要邮箱验证码，验证码 10 分钟内有效。</p>
        </div>
      ) : null}

      {message ? <p className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-300">{message}</p> : null}
      {error ? <p className="rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-300">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
        {isSubmitting ? (isRegister ? "注册中" : "登录中") : isRegister ? "注册并登录" : "登录"}
      </button>

      <p className="pt-1 text-center text-sm font-medium text-ink-secondary">
        {isRegister ? "已有账号？" : "还没有账号？"}
        <Link href={switchHref} className="ml-1 font-semibold text-brand-600 transition hover:text-brand-500">
          {isRegister ? "去登录" : "去注册"}
        </Link>
      </p>

      {oauthProviders.length ? (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center gap-3 text-xs text-ink-faint">
            <span className="h-px flex-1 bg-line" />
            <span>或使用第三方账号</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="flex flex-col gap-2">
            {oauthProviders.map((item) => (
              <a
                key={item.provider}
                href={`/api/auth/oauth/${item.provider}/start`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-ink-secondary transition hover:bg-page"
              >
                使用 {item.label} 登录
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
