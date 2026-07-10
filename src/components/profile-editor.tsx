"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

import type { UserProfileView } from "@/lib/profile";

const DISPLAY_NAME_MAX_LENGTH = 24;

type ProfileResponse = {
  ok?: boolean;
  error?: string;
  profile?: UserProfileView;
};

async function readJson(response: Response): Promise<ProfileResponse> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as ProfileResponse;
  }
  return { ok: false, error: "接口返回异常，请稍后再试。" };
}

export function ProfileEditor({ initialProfile }: { initialProfile: UserProfileView }) {
  const [displayName, setDisplayName] = useState(initialProfile.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl ?? "");
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const email = initialProfile.email ?? "";
  const fallbackInitial = (displayName.trim() || email.split("@")[0] || "U").slice(0, 1).toUpperCase();

  async function saveDisplayName() {
    setError("");
    setMessage("");
    setSavingName(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const payload = await readJson(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "保存昵称失败。");
      }
      setDisplayName(payload.profile?.displayName ?? "");
      setMessage("昵称已保存。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存昵称失败。");
    } finally {
      setSavingName(false);
    }
  }

  async function uploadAvatar(file: File) {
    setError("");
    setMessage("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const payload = await readJson(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "上传头像失败。");
      }
      setAvatarUrl(payload.profile?.avatarUrl ?? "");
      setMessage("头像已更新。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "上传头像失败。");
    } finally {
      setUploading(false);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-panel p-6 shadow-card">
        <h2 className="text-base font-bold text-ink">头像</h2>
        <p className="mt-1 text-sm leading-6 text-ink-faint">支持 PNG、JPG、WEBP，不超过 4MB。</p>
        <div className="mt-4 flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="头像" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-bold text-white">
              {fallbackInitial}
            </span>
          )}
          <div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-chip transition hover:bg-brand-600 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "上传中" : "更换头像"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void uploadAvatar(file);
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-6 shadow-card">
        <h2 className="text-base font-bold text-ink">昵称</h2>
        <p className="mt-1 text-sm leading-6 text-ink-faint">留空则使用邮箱前缀显示。最多 {DISPLAY_NAME_MAX_LENGTH} 个字符。</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={displayName}
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            placeholder={email.split("@")[0] || "输入昵称"}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full flex-1 rounded-xl border border-line bg-page/60 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:bg-panel focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="button"
            disabled={savingName}
            onClick={() => void saveDisplayName()}
            className="shrink-0 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-chip transition hover:bg-brand-600 disabled:opacity-60"
          >
            {savingName ? "保存中" : "保存昵称"}
          </button>
        </div>
        {email ? <p className="mt-3 text-xs text-ink-faint">登录邮箱：{email}</p> : null}
      </div>

      {message ? <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">{message}</div> : null}
      {error ? <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-500 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}
    </div>
  );
}
