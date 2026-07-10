"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import clsx from "clsx";

type NotificationView = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

const POLL_INTERVAL_MS = 60_000;

function formatTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return date.toLocaleDateString("zh-CN");
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationView[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const refreshUnread = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?unreadOnly=1", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { unreadCount?: number };
      setUnread(payload.unreadCount ?? 0);
    } catch {
      // 静默失败，下一轮轮询再试。
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { notifications?: NotificationView[]; unreadCount?: number };
      setItems(payload.notifications ?? []);
      setUnread(payload.unreadCount ?? 0);
    } catch {
      // 静默失败。
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
    const timer = window.setInterval(() => void refreshUnread(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refreshUnread]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggleOpen() {
    setOpen((value) => {
      const next = !value;
      if (next) {
        void loadList();
      }
      return next;
    });
  }

  async function markAllRead() {
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnread(0);
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => null);
  }

  async function openItem(item: NotificationView) {
    if (!item.isRead) {
      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, isRead: true } : row)));
      setUnread((count) => Math.max(0, count - 1));
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      }).catch(() => null);
    }
    setOpen(false);
    if (item.link) {
      router.push(item.link);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="通知"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary transition hover:bg-brand-50 hover:text-brand-600"
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-panel shadow-pop">
          <div className="flex items-center justify-between border-b border-line bg-page/60 px-4 py-3">
            <p className="text-sm font-bold text-ink">通知</p>
            {items.some((item) => !item.isRead) ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 transition hover:text-brand-700"
              >
                <CheckCheck size={13} />
                全部已读
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-faint">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载中
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-ink-faint">暂无通知</div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openItem(item)}
                  className={clsx(
                    "flex w-full flex-col gap-0.5 border-b border-line px-4 py-3 text-left transition last:border-b-0 hover:bg-brand-50/60",
                    !item.isRead && "bg-brand-50/40",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!item.isRead ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" /> : <span className="mt-1.5 h-2 w-2 shrink-0" />}
                    <span className="text-sm font-medium text-ink">{item.title}</span>
                  </div>
                  {item.body ? <p className="pl-4 text-xs leading-5 text-ink-secondary line-clamp-2">{item.body}</p> : null}
                  <span className="pl-4 text-[11px] text-ink-faint">{formatTime(item.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
