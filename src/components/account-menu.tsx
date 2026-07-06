"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, KeyRound, LogOut, Settings, UserRound, WalletCards } from "lucide-react";
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const displayName = getDisplayName(email);
  const isAdmin = role === "admin";

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function logout() {
    setPending("logout");
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = isAdmin ? "/console" : "/signin";
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

  const passwordFields = [
    { label: "当前密码", value: currentPassword, setValue: setCurrentPassword, autoComplete: "current-password" },
    { label: "新密码", value: newPassword, setValue: setNewPassword, autoComplete: "new-password" },
    { label: "确认新密码", value: confirmPassword, setValue: setConfirmPassword, autoComplete: "new-password" },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={clsx(
          "flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition",
          variant === "admin" ? "hover:bg-black/5 dark:bg-white/10" : "hover:bg-brand-50",
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-28 truncate text-sm font-semibold text-ink md:block">{displayName}</span>
        <ChevronDown size={14} className={clsx("text-ink-faint transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-panel shadow-pop">
          <div className="border-b border-line bg-page/60 px-4 py-3">
            <p className="truncate text-sm font-bold text-ink">{displayName}</p>
            <p className="mt-0.5 truncate text-xs text-ink-faint">{email}</p>
          </div>
          <div className="p-1.5">
            {!isAdmin ? (
              <>
                <a
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-secondary transition hover:bg-brand-50 hover:text-brand-600"
                  href="/console#/account/overview"
                  onClick={() => setOpen(false)}
                >
                  <WalletCards size={15} />
                  账户与积分
                </a>
                <Link
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-secondary transition hover:bg-brand-50 hover:text-brand-600"
                  href="/history"
                  onClick={() => setOpen(false)}
                >
                  <UserRound size={15} />
                  我的生成记录
                </Link>
              </>
            ) : (
              <a
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-secondary transition hover:bg-brand-50 hover:text-brand-600"
                href="/console"
                onClick={() => setOpen(false)}
              >
                <Settings size={15} />
                管理控制台
              </a>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-secondary transition hover:bg-brand-50 hover:text-brand-600"
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
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-300 transition hover:bg-rose-50 dark:hover:bg-rose-500/10 dark:bg-rose-500/10"
              disabled={pending === "logout"}
              onClick={() => void logout()}
            >
              <LogOut size={15} />
              {pending === "logout" ? "退出中" : "退出登录"}
            </button>
          </div>
        </div>
      ) : null}

      {passwordOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="修改密码">
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]" onClick={() => setPasswordOpen(false)} />
          <div className="relative w-full max-w-md space-y-4 rounded-2xl border border-line bg-panel p-6 shadow-pop">
            <div>
              <h2 className="text-lg font-bold text-ink">修改密码</h2>
              <p className="mt-1 text-sm leading-6 text-ink-faint">密码至少 6 位。修改成功后当前登录会继续有效，下次登录使用新密码。</p>
            </div>
            {passwordFields.map((field) => (
              <label key={field.label} className="block">
                <span className="text-sm font-semibold text-ink-secondary">{field.label}</span>
                <input
                  type="password"
                  value={field.value}
                  autoComplete={field.autoComplete}
                  onChange={(event) => field.setValue(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-page/60 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:bg-panel focus:ring-2 focus:ring-brand-100"
                />
              </label>
            ))}
            {message ? <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-300">{message}</div> : null}
            {error ? <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-300">{error}</div> : null}
            <div className="flex justify-end gap-2.5 pt-1">
              <button
                type="button"
                className="rounded-xl border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-page"
                onClick={() => setPasswordOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-chip transition hover:bg-brand-600 disabled:opacity-60"
                disabled={pending === "password"}
                onClick={() => void changePassword()}
              >
                {pending === "password" ? "保存中" : "确认修改"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
