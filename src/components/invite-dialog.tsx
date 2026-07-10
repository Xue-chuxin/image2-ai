"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Gift, Loader2, X } from "lucide-react";

type InviteSummary = {
  enabled: boolean;
  code: string;
  invitedCount: number;
  rewardTotal: number;
  inviterCredits: number;
  inviteeCredits: number;
};

export function InviteDialog({ onClose }: { onClose: () => void }) {
  const [summary, setSummary] = useState<InviteSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/invite")
      .then((response) => response.json())
      .then((data: { ok?: boolean; error?: string; summary?: InviteSummary }) => {
        if (!alive) {
          return;
        }
        if (data?.ok && data.summary) {
          setSummary(data.summary);
        } else {
          setError(data?.error || "获取邀请信息失败。");
        }
      })
      .catch(() => {
        if (alive) {
          setError("获取邀请信息失败，请稍后再试。");
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const inviteLink =
    summary && typeof window !== "undefined" ? `${window.location.origin}/signup?ref=${summary.code}` : "";

  async function copyLink() {
    if (!inviteLink) {
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败，请手动复制邀请链接。");
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-panel shadow-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <Gift size={16} />
            </span>
            <p className="text-[15px] font-bold text-ink">邀请好友，双方得积分</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition hover:bg-page hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-ink-faint">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : error ? (
            <p className="rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-300">{error}</p>
          ) : summary ? (
            <div className="space-y-4">
              {!summary.enabled ? (
                <p className="rounded-xl bg-page px-3.5 py-2.5 text-sm font-medium text-ink-secondary">
                  邀请返积分活动暂未开启，你仍可保存邀请码，活动开启后即刻生效。
                </p>
              ) : (
                <p className="text-sm leading-6 text-ink-secondary">
                  好友通过你的专属链接注册后，你可得 <span className="font-bold text-brand-600">{summary.inviterCredits}</span> 积分，
                  好友额外得 <span className="font-bold text-brand-600">{summary.inviteeCredits}</span> 积分。
                </p>
              )}

              <div>
                <span className="text-xs font-semibold text-ink-faint">我的邀请码</span>
                <p className="mt-1 text-2xl font-black tracking-[0.2em] text-ink">{summary.code}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-ink-faint">专属邀请链接</span>
                <div className="mt-1.5 flex items-stretch gap-2">
                  <div className="flex min-w-0 flex-1 items-center rounded-xl border border-line bg-page px-3.5 py-2.5">
                    <span className="truncate text-sm text-ink-secondary">{inviteLink}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? "已复制" : "复制"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-line bg-page px-4 py-3">
                  <p className="text-xs font-semibold text-ink-faint">已邀请好友</p>
                  <p className="mt-1 text-xl font-black text-ink">{summary.invitedCount}</p>
                </div>
                <div className="rounded-xl border border-line bg-page px-4 py-3">
                  <p className="text-xs font-semibold text-ink-faint">累计返积分</p>
                  <p className="mt-1 text-xl font-black text-ink">{summary.rewardTotal}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
