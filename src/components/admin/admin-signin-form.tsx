"use client";

import { useState } from "react";
import { Alert, Button, Input } from "tdesign-react";
import { LockOnIcon, LoginIcon, MailIcon } from "tdesign-icons-react";

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
    <form onSubmit={handleSubmit} className="admin-td-signin-form">
      <label className="admin-td-signin-field">
        <span className="admin-td-signin-label">管理员邮箱</span>
        <Input
          value={email}
          autocomplete="username"
          clearable
          prefixIcon={<MailIcon />}
          placeholder="admin@example.com"
          onChange={(value) => setEmail(String(value))}
        />
      </label>
      <label className="admin-td-signin-field">
        <span className="admin-td-signin-label">管理员密码</span>
        <Input
          value={password}
          autocomplete="current-password"
          prefixIcon={<LockOnIcon />}
          placeholder="请输入密码"
          type="password"
          onChange={(value) => setPassword(String(value))}
        />
      </label>
      {error ? <Alert theme="error" message={error} /> : null}
      <Button block theme="primary" type="submit" loading={isSubmitting} icon={<LoginIcon />}>
        {isSubmitting ? "登录中" : "进入后台"}
      </Button>
    </form>
  );
}
