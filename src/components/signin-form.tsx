"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Alert, Button, Input } from "tdesign-react";

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
  variant = "glass",
}: {
  nextPath?: string;
  mode?: UserAuthMode;
  variant?: "glass" | "tdesign";
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const isRegister = mode === "register";
  const switchHref = `${isRegister ? "/signin" : "/signup"}${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;

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

  if (variant === "tdesign") {
    return (
      <div className="td-signin-form">
        <form onSubmit={handleSubmit} className="td-signin-form__body">
          <label className="td-field-block">
            <span>用户邮箱</span>
            <Input
              value={email}
              type="text"
              name="email"
              autocomplete="email"
              placeholder="name@example.com"
              prefixIcon={<Mail className="h-4 w-4" />}
              onChange={(value) => setEmail(String(value))}
            />
          </label>

          <label className="td-field-block">
            <span>{isRegister ? "设置密码" : "登录密码"}</span>
            <Input
              value={password}
              type="password"
              placeholder={isRegister ? "至少 6 位，用于后续登录" : "请输入登录密码"}
              prefixIcon={<LockKeyhole className="h-4 w-4" />}
              onChange={(value) => setPassword(String(value))}
            />
          </label>

          {isRegister ? (
            <div className="td-signin-code-row">
              <label className="td-field-block">
                <span>注册验证码</span>
                <Input
                  value={verificationCode}
                  placeholder="新用户填写 6 位验证码"
                  prefixIcon={<ShieldCheck className="h-4 w-4" />}
                  maxlength={6}
                  onChange={(value) => setVerificationCode(String(value).replace(/\D/g, "").slice(0, 6))}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                loading={isSendingCode}
                disabled={isSubmitting || codeCooldown > 0 || !email.trim()}
                onClick={() => void sendVerificationCode()}
              >
                {codeCooldown > 0 ? `${codeCooldown} 秒后重发` : "发送验证码"}
              </Button>
            </div>
          ) : null}

          {message ? <Alert theme="success" message={message} /> : null}
          {error ? <Alert theme="error" message={error} /> : null}

          <Button type="submit" theme="primary" size="large" block loading={isSubmitting}>
            {isRegister ? "注册并登录" : "登录"}
          </Button>
          <p className="td-muted-line">
            {isRegister ? "已有账号？" : "还没有账号？"}
            <Link href={switchHref}>{isRegister ? "去登录" : "去注册"}</Link>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="text-sm font-bold text-slate-700">用户邮箱</span>
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
          <span className="text-sm font-bold text-slate-700">{isRegister ? "设置密码" : "登录密码"}</span>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-ocean-100 bg-ocean-50/60 px-4 py-3">
            <LockKeyhole className="h-4 w-4 text-ocean-700" />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder={isRegister ? "至少 6 位，用于后续登录" : "请输入登录密码"}
              type="password"
            />
          </div>
        </label>

        {isRegister ? (
          <div className="block">
            <span className="text-sm font-bold text-slate-700">注册验证码</span>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-ocean-100 bg-ocean-50/60 px-4 py-3">
                <ShieldCheck className="h-4 w-4 text-ocean-700" />
                <input
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="新用户填写 6 位验证码"
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
              <button
                type="button"
                onClick={() => void sendVerificationCode()}
                disabled={isSendingCode || isSubmitting || codeCooldown > 0 || !email.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-ocean-100 bg-white px-4 py-3 text-sm font-black text-ocean-800 shadow-card disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {isSendingCode ? "发送中" : codeCooldown > 0 ? `${codeCooldown} 秒后重发` : "发送验证码"}
              </button>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-500">新用户注册需要邮箱验证码，验证码 10 分钟内有效。</p>
          </div>
        ) : null}

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
          {isSubmitting ? (isRegister ? "注册中" : "登录中") : isRegister ? "注册并登录" : "登录"}
        </button>
        <p className="text-center text-sm font-bold text-slate-500">
          {isRegister ? "已有账号？" : "还没有账号？"}
          <Link href={switchHref} className="ml-1 text-ocean-800 underline-offset-4 hover:underline">
            {isRegister ? "去登录" : "去注册"}
          </Link>
        </p>
      </form>
    </div>
  );
}
