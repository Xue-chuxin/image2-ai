"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, LogOut, RefreshCw, Save, ShieldAlert, XCircle } from "lucide-react";

import type { AdminAppSettings, AdminDiagnosticStatus, GenerationProviderName } from "@/lib/settings";

type SettingsResponse = {
  ok: boolean;
  settings?: AdminAppSettings;
  error?: string;
};

type ChatGPTWebStatusResponse = {
  ok: boolean;
  status?: {
    enabled: boolean;
    ready: boolean;
    userDataDir: string;
    headless: boolean;
    timeoutSeconds: number;
    message: string;
  };
  error?: string;
};

async function readSettingsResponse(response: Response): Promise<SettingsResponse> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as SettingsResponse;
  }

  const text = await response.text();
  return {
    ok: false,
    error: text.includes("<!DOCTYPE") ? "接口返回了 HTML 错误页，请查看服务端日志。" : text || "接口返回格式异常。",
  };
}

async function readChatGPTWebResponse(response: Response): Promise<ChatGPTWebStatusResponse> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as ChatGPTWebStatusResponse;
  }

  const text = await response.text();
  return {
    ok: false,
    error: text.includes("<!DOCTYPE") ? "接口返回了 HTML 错误页，请查看服务端日志。" : text || "接口返回格式异常。",
  };
}

function statusStyle(status: AdminDiagnosticStatus) {
  if (status === "ok") {
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      card: "border-emerald-100 bg-emerald-50/70 text-emerald-800",
    };
  }

  if (status === "warning") {
    return {
      icon: <ShieldAlert className="h-4 w-4 text-amber-500" />,
      card: "border-amber-100 bg-amber-50/70 text-amber-800",
    };
  }

  return {
    icon: <XCircle className="h-4 w-4 text-red-500" />,
    card: "border-red-100 bg-red-50/70 text-red-700",
  };
}

export function AdminSettingsForm({ initialSettings }: { initialSettings: AdminAppSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [chatgptMessage, setChatgptMessage] = useState("");
  const [chatgptError, setChatgptError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpeningChatGPT, setIsOpeningChatGPT] = useState(false);
  const [isCheckingChatGPT, setIsCheckingChatGPT] = useState(false);

  function update<K extends keyof AdminAppSettings>(key: K, value: AdminAppSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          browserTitle: settings.browserTitle,
          siteTitle: settings.siteTitle,
          siteSubtitle: settings.siteSubtitle,
          defaultGenerationProvider: settings.defaultGenerationProvider,
          deepseekBaseUrl: settings.deepseekBaseUrl,
          deepseekModel: settings.deepseekModel,
          deepseekPolishPrompt: settings.deepseekPolishPrompt,
          openaiImageModel: settings.openaiImageModel,
          chatgptWebEnabled: settings.chatgptWebEnabled,
          chatgptWebUserDataDir: settings.chatgptWebUserDataDir,
          chatgptWebHeadless: settings.chatgptWebHeadless,
          chatgptWebTimeoutSeconds: settings.chatgptWebTimeoutSeconds,
          deepseekApiKey,
          openaiApiKey,
        }),
      });
      const data = await readSettingsResponse(response);

      if (!response.ok || !data.ok || !data.settings) {
        throw new Error(data.error || "保存失败。");
      }

      setSettings(data.settings);
      setDeepseekApiKey("");
      setOpenaiApiKey("");
      setMessage("配置已保存。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "保存失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function openChatGPTLoginBrowser() {
    setChatgptError("");
    setChatgptMessage("");
    setIsOpeningChatGPT(true);

    try {
      const response = await fetch("/api/admin/chatgpt-web/open-login", { method: "POST" });
      const data = await readChatGPTWebResponse(response);
      if (!response.ok || !data.ok || !data.status) {
        throw new Error(data.error || "打开登录浏览器失败。");
      }
      setChatgptMessage(data.status.message);
    } catch (caughtError) {
      setChatgptError(caughtError instanceof Error ? caughtError.message : "打开登录浏览器失败。");
    } finally {
      setIsOpeningChatGPT(false);
    }
  }

  async function checkChatGPTStatus() {
    setChatgptError("");
    setChatgptMessage("");
    setIsCheckingChatGPT(true);

    try {
      const response = await fetch("/api/admin/chatgpt-web/check", { method: "POST" });
      const data = await readChatGPTWebResponse(response);
      if (!response.ok || !data.ok || !data.status) {
        throw new Error(data.error || "检测登录状态失败。");
      }
      setChatgptMessage(data.status.message);
    } catch (caughtError) {
      setChatgptError(caughtError instanceof Error ? caughtError.message : "检测登录状态失败。");
    } finally {
      setIsCheckingChatGPT(false);
    }
  }

  async function logout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/signin?mode=admin";
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
      <section className="space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Site</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">站点显示</h2>
          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">浏览器标题</span>
              <input
                value={settings.browserTitle}
                onChange={(event) => update("browserTitle", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-ocean-400"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">网站标题</span>
              <input
                value={settings.siteTitle}
                onChange={(event) => update("siteTitle", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-ocean-400"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">网站副标题</span>
              <input
                value={settings.siteSubtitle}
                onChange={(event) => update("siteSubtitle", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-ocean-400"
              />
            </label>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Provider</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">生图配置</h2>
          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">默认生图 Provider</span>
              <select
                value={settings.defaultGenerationProvider}
                onChange={(event) => update("defaultGenerationProvider", event.target.value as GenerationProviderName)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-ocean-400"
              >
                <option value="chatgpt_web">ChatGPT Web 本机浏览器</option>
                <option value="openai">OpenAI 官方 API</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">OpenAI 图像模型</span>
              <input
                value={settings.openaiImageModel}
                onChange={(event) => update("openaiImageModel", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-ocean-400"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">OpenAI API Key</span>
              <input
                value={openaiApiKey}
                onChange={(event) => setOpenaiApiKey(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-ocean-400"
                placeholder={settings.openaiApiKeyConfigured ? "已配置，留空表示不修改" : "未配置"}
                type="password"
              />
            </label>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">ChatGPT Web</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">网页版 ChatGPT</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
            使用本机浏览器 Profile 保存登录态，不保存 ChatGPT 账号、密码或 Cookie。
          </p>
          <div className="mt-5 grid gap-4">
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <span>
                <span className="block text-sm font-black text-slate-800">启用 ChatGPT Web</span>
                <span className="mt-1 block text-xs font-bold text-slate-400">启用后才能作为默认 Provider 使用。</span>
              </span>
              <input
                checked={settings.chatgptWebEnabled}
                onChange={(event) => update("chatgptWebEnabled", event.target.checked)}
                type="checkbox"
                className="h-5 w-5 rounded border-slate-300 text-slate-950"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">浏览器 Profile 路径</span>
              <input
                value={settings.chatgptWebUserDataDir}
                onChange={(event) => update("chatgptWebUserDataDir", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-ocean-400"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span>
                  <span className="block text-sm font-black text-slate-800">无头模式</span>
                  <span className="mt-1 block text-xs font-bold text-slate-400">登录阶段会强制显示浏览器。</span>
                </span>
                <input
                  checked={settings.chatgptWebHeadless}
                  onChange={(event) => update("chatgptWebHeadless", event.target.checked)}
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-300 text-slate-950"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-700">超时时间（秒）</span>
                <input
                  value={settings.chatgptWebTimeoutSeconds}
                  onChange={(event) => update("chatgptWebTimeoutSeconds", Number(event.target.value))}
                  type="number"
                  min={30}
                  max={900}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-ocean-400"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={openChatGPTLoginBrowser}
                disabled={isOpeningChatGPT}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-card disabled:opacity-60"
              >
                {isOpeningChatGPT ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                打开登录浏览器
              </button>
              <button
                type="button"
                onClick={checkChatGPTStatus}
                disabled={isCheckingChatGPT}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-card disabled:opacity-60"
              >
                {isCheckingChatGPT ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                检测登录状态
              </button>
            </div>
          </div>
          {chatgptMessage ? <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{chatgptMessage}</p> : null}
          {chatgptError ? <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{chatgptError}</p> : null}
        </div>
      </section>

      <aside className="space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Health</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">配置检测</h2>
            </div>
            <button
              type="button"
              onClick={logout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-card disabled:opacity-60"
            >
              {isLoggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              退出
            </button>
          </div>
          <div className="mt-5 grid gap-3">
            {settings.diagnostics.map((item) => {
              const visual = statusStyle(item.status);
              return (
                <div key={item.key} className={`rounded-2xl border px-4 py-3 ${visual.card}`}>
                  <div className="flex items-center gap-2 text-sm font-black">
                    {visual.icon}
                    {item.label}
                  </div>
                  <p className="mt-2 text-xs font-bold leading-5 opacity-80">{item.message}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">DeepSeek</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">润色接口</h2>
          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Base URL</span>
              <input
                value={settings.deepseekBaseUrl}
                onChange={(event) => update("deepseekBaseUrl", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-ocean-400"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">模型</span>
              <input
                value={settings.deepseekModel}
                onChange={(event) => update("deepseekModel", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-ocean-400"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">DeepSeek API Key</span>
              <input
                value={deepseekApiKey}
                onChange={(event) => setDeepseekApiKey(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-ocean-400"
                placeholder={settings.deepseekApiKeyConfigured ? "已配置，留空表示不修改" : "未配置"}
                type="password"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">润色系统提示词</span>
              <textarea
                value={settings.deepseekPolishPrompt}
                onChange={(event) => update("deepseekPolishPrompt", event.target.value)}
                rows={9}
                className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-ocean-400"
              />
              <span className="mt-2 block text-xs font-bold leading-5 text-slate-400">
                点击前台“AI 润色”时，会把这里的提示词和用户输入一起提交给 DeepSeek。
              </span>
            </label>
          </div>
          {message ? <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p> : null}
          <button
            disabled={isSaving}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-card disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "保存中" : "保存配置"}
          </button>
        </div>
      </aside>
    </form>
  );
}
