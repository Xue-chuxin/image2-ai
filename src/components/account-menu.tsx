"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, KeyRound, LogOut, Settings, UserRound } from "lucide-react";
import clsx from "clsx";

type AccountMenuProps = {
  email: string;
  role: "user" | "admin";
  variant?: "front" | "admin";
};

type PasswordResponse = {
  ok?: boolean;
  error?: string;
};

function getDisplayName(email: string) {
  return email.split("@")[0] || email;
}

async function readPasswordResponse(response: Response): Promise<PasswordResponse> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as PasswordResponse;
  }
  return {
    ok: false,
    error: "接口返回异常，请稍后再试。",
  };
}

export function AccountMenu({ email, role, variant = "front" }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState<"password" | "logout" | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const displayName = getDisplayName(email);
  const isAdmin = role === "admin";

  async function logout() {
    setPending("logout");
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = isAdmin ? "/admin/signin" : "/signin";
  }

  async function changePassword() {
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致。");
      return;
    }

    setPending("password");
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          currentPassword,
          newPassword,
        }),
      });
      const payload = await readPasswordResponse(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "修改密码失败。");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("密码已更新，下次登录请使用新密码。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "修改密码失败。");
    } finally {
      setPending("");
    }
  }

  return (
    <div className={clsx("account-menu", variant === "admin" && "account-menu--admin")}>
      <button className="account-menu__trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <UserRound size={16} />
        <span>{displayName}</span>
        <ChevronDown size={14} />
      </button>

      {open ? (
        <div className="account-menu__dropdown">
          <div className="account-menu__identity">
            <strong>{displayName}</strong>
            <span>{email}</span>
          </div>
          {!isAdmin ? (
            <Link className="account-menu__item" href="/account" onClick={() => setOpen(false)}>
              <UserRound size={15} />
              个人中心
            </Link>
          ) : null}
          {isAdmin ? (
            <Link className="account-menu__item" href="/admin" onClick={() => setOpen(false)}>
              <Settings size={15} />
              后台首页
            </Link>
          ) : null}
          <button
            className="account-menu__item"
            type="button"
            onClick={() => {
              setPasswordOpen(true);
              setOpen(false);
              setError("");
              setMessage("");
            }}
          >
            <KeyRound size={15} />
            修改密码
          </button>
          <button className="account-menu__item account-menu__item--danger" type="button" disabled={pending === "logout"} onClick={() => void logout()}>
            <LogOut size={15} />
            {pending === "logout" ? "退出中" : "退出登录"}
          </button>
        </div>
      ) : null}

      {passwordOpen ? (
        <div className="account-password-dialog" role="dialog" aria-modal="true" aria-label="修改密码">
          <div className="account-password-dialog__backdrop" onClick={() => setPasswordOpen(false)} />
          <div className="account-password-dialog__panel">
            <div>
              <p className="account-password-dialog__eyebrow">{isAdmin ? "Admin Security" : "Account Security"}</p>
              <h2>修改密码</h2>
              <p>密码至少 6 位。修改成功后当前登录会继续有效，下次登录使用新密码。</p>
            </div>
            <label>
              <span>当前密码</span>
              <input type="password" value={currentPassword} autoComplete="current-password" onChange={(event) => setCurrentPassword(event.target.value)} />
            </label>
            <label>
              <span>新密码</span>
              <input type="password" value={newPassword} autoComplete="new-password" onChange={(event) => setNewPassword(event.target.value)} />
            </label>
            <label>
              <span>确认新密码</span>
              <input type="password" value={confirmPassword} autoComplete="new-password" onChange={(event) => setConfirmPassword(event.target.value)} />
            </label>
            {message ? <div className="account-password-dialog__message">{message}</div> : null}
            {error ? <div className="account-password-dialog__error">{error}</div> : null}
            <div className="account-password-dialog__actions">
              <button type="button" className="account-password-dialog__cancel" onClick={() => setPasswordOpen(false)}>
                取消
              </button>
              <button type="button" className="account-password-dialog__submit" disabled={pending === "password"} onClick={() => void changePassword()}>
                {pending === "password" ? "保存中" : "确认修改"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
