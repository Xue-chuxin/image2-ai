"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Check, Loader2, Sparkles, X } from "lucide-react";
import { clsx } from "clsx";

type CheckInStatus = {
  enabled: boolean;
  checkedInToday: boolean;
  streak: number;
  nextStreak: number;
  todayCredits: number;
  totalCheckIns: number;
  totalEarned: number;
  maxStreakBonusDays: number;
};

export function CheckinDialog({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [justEarned, setJustEarned] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/checkin")
      .then((response) => response.json())
      .then((data: { ok?: boolean; error?: string; status?: CheckInStatus }) => {
        if (!alive) {
          return;
        }
        if (data?.ok && data.status) {
          setStatus(data.status);
        } else {
          setError(data?.error || "获取签到信息失败。");
        }
      })
      .catch(() => {
        if (alive) {
          setError("获取签到信息失败，请稍后再试。");
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

  async function checkIn() {
    if (submitting || !status || status.checkedInToday) {
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/checkin", { method: "POST" });
      const data: { ok?: boolean; error?: string; status?: CheckInStatus; result?: { credits: number } } =
        await response.json();
      if (data?.ok && data.status) {
        setStatus(data.status);
        setJustEarned(data.result?.credits ?? data.status.todayCredits);
      } else {
        setError(data?.error || "签到失败，请稍后再试。");
      }
    } catch {
      setError("签到失败，请稍后再试。");
    } finally {
      setSubmitting(false);
    }
  }

  // 签到连续条：展示 1..(maxStreakBonusDays+1) 天，已连续签到的高亮。
  const totalDays = status ? Math.max(1, status.maxStreakBonusDays + 1) : 0;
  const filledDays = status ? Math.min(status.streak, totalDays) : 0;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-panel shadow-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <CalendarCheck size={16} />
            </span>
            <p className="text-[15px] font-bold text-ink">每日签到领积分</p>
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
          ) : status ? (
            <div className="space-y-4">
              {!status.enabled ? (
                <p className="rounded-xl bg-page px-3.5 py-2.5 text-sm font-medium text-ink-secondary">
                  每日签到活动暂未开启，开启后即可每天签到领积分。
                </p>
              ) : (
                <p className="text-sm leading-6 text-ink-secondary">
                  连续签到奖励更高。当前已连续签到{" "}
                  <span className="font-bold text-brand-600">{status.streak}</span> 天，
                  {status.checkedInToday ? "今日已签到。" : "今天还没签到哦。"}
                </p>
              )}

              <div className="flex items-center justify-center gap-1.5">
                {Array.from({ length: totalDays }).map((_, index) => {
                  const filled = index < filledDays;
                  return (
                    <span
                      key={index}
                      className={clsx(
                        "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition",
                        filled
                          ? "bg-emerald-500 text-white"
                          : "bg-page text-ink-faint border border-line",
                      )}
                    >
                      {filled ? <Check size={13} /> : index + 1}
                    </span>
                  );
                })}
              </div>

              {justEarned !== null ? (
                <p className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                  <Sparkles size={15} /> 签到成功，获得 {justEarned} 积分！
                </p>
              ) : error ? (
                <p className="rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-300">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => void checkIn()}
                disabled={!status.enabled || status.checkedInToday || submitting}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : status.checkedInToday ? (
                  <>
                    <Check size={15} /> 今日已签到（+{status.todayCredits}）
                  </>
                ) : (
                  <>
                    <CalendarCheck size={15} /> 立即签到 +{status.todayCredits} 积分
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-line bg-page px-4 py-3">
                  <p className="text-xs font-semibold text-ink-faint">累计签到</p>
                  <p className="mt-1 text-xl font-black text-ink">{status.totalCheckIns}</p>
                </div>
                <div className="rounded-xl border border-line bg-page px-4 py-3">
                  <p className="text-xs font-semibold text-ink-faint">累计获得积分</p>
                  <p className="mt-1 text-xl font-black text-ink">{status.totalEarned}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-300">
              {error || "获取签到信息失败。"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
