"use client";

import { useState } from "react";
import { Alert, Button, Card, Form, Input, InputNumber, Select, Switch, Tabs, Tag, Textarea } from "tdesign-react";
import type { AdminAppSettings, AdminDiagnosticStatus, GenerationProviderName, OpenAICompatibleChannelSetting, StorageProviderName } from "@/lib/settings";

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

type OpenAIChannelCheckResponse = {
  ok: boolean;
  status?: {
    channelId: string;
    channelName: string;
    checkedUrl: string;
    message: string;
  };
  error?: string;
};

type EmailTestResponse = {
  ok: boolean;
  message?: string;
  error?: string;
};

type EditableOpenAIChannel = OpenAICompatibleChannelSetting & {
  apiKey: string;
};

function createEditableOpenAIChannels(channels: OpenAICompatibleChannelSetting[]): EditableOpenAIChannel[] {
  return channels.map((channel) => ({ ...channel, apiKey: "" }));
}

function createOpenAIChannel(index: number): EditableOpenAIChannel {
  const now = Date.now();
  return {
    id: `openai-compatible-${now}-${index + 1}`,
    name: `中转站 ${index + 1}`,
    enabled: true,
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-image-2",
    timeoutSeconds: 120,
    priority: index,
    apiKeyConfigured: false,
    apiKey: "",
  };
}

function orderOpenAIChannels(channels: EditableOpenAIChannel[]) {
  return channels.map((channel, index) => ({ ...channel, priority: index }));
}

function mergeSavedOpenAIChannels(
  returnedChannels: OpenAICompatibleChannelSetting[],
  submittedChannels: EditableOpenAIChannel[],
): OpenAICompatibleChannelSetting[] {
  const returnedById = new Map(returnedChannels.map((channel) => [channel.id, channel]));

  return submittedChannels.map((channel, index) => {
    const returned = returnedById.get(channel.id);

    return {
      id: returned?.id || channel.id,
      name: channel.name,
      enabled: channel.enabled,
      baseUrl: channel.baseUrl,
      model: channel.model,
      timeoutSeconds: channel.timeoutSeconds,
      priority: index,
      apiKeyConfigured: Boolean(returned?.apiKeyConfigured || channel.apiKeyConfigured || channel.apiKey.trim()),
    };
  });
}

function mergeSettingsAfterSave({
  returnedSettings,
  submittedSettings,
  submittedChannels,
  deepseekApiKey,
  openaiApiKey,
  stabilityAiApiKey,
  emailSmtpPassword,
}: {
  returnedSettings: AdminAppSettings;
  submittedSettings: AdminAppSettings;
  submittedChannels: EditableOpenAIChannel[];
  deepseekApiKey: string;
  openaiApiKey: string;
  stabilityAiApiKey: string;
  emailSmtpPassword: string;
}): AdminAppSettings {
  const openaiCompatibleChannels = mergeSavedOpenAIChannels(returnedSettings.openaiCompatibleChannels, submittedChannels);
  const openaiApiKeyConfigured = Boolean(
    returnedSettings.openaiApiKeyConfigured ||
      submittedSettings.openaiApiKeyConfigured ||
      submittedSettings.legacyOpenaiApiKeyConfigured ||
      openaiApiKey.trim() ||
      openaiCompatibleChannels.some((channel) => channel.enabled && channel.apiKeyConfigured),
  );

  return {
    ...returnedSettings,
    browserTitle: submittedSettings.browserTitle,
    siteTitle: submittedSettings.siteTitle,
    siteSubtitle: submittedSettings.siteSubtitle,
    defaultGenerationProvider: submittedSettings.defaultGenerationProvider,
    deepseekBaseUrl: submittedSettings.deepseekBaseUrl,
    deepseekModel: submittedSettings.deepseekModel,
    openaiImageModel: submittedSettings.openaiImageModel,
    stabilityAiModel: submittedSettings.stabilityAiModel,
    chatgptWebEnabled: submittedSettings.chatgptWebEnabled,
    chatgptWebUserDataDir: submittedSettings.chatgptWebUserDataDir,
    chatgptWebHeadless: submittedSettings.chatgptWebHeadless,
    chatgptWebTimeoutSeconds: submittedSettings.chatgptWebTimeoutSeconds,
    storageProvider: submittedSettings.storageProvider,
    storageLocalBaseDir: submittedSettings.storageLocalBaseDir,
    storagePublicBaseUrl: submittedSettings.storagePublicBaseUrl,
    storageGeneratedPrefix: submittedSettings.storageGeneratedPrefix,
    storageUploadsPrefix: submittedSettings.storageUploadsPrefix,
    storageEndpoint: submittedSettings.storageEndpoint,
    storageBucket: submittedSettings.storageBucket,
    storageRegion: submittedSettings.storageRegion,
    openaiCompatibleChannels,
    deepseekPolishPrompt: submittedSettings.deepseekPolishPrompt,
    moderationEnabled: submittedSettings.moderationEnabled,
    moderationForbiddenWords: submittedSettings.moderationForbiddenWords,
    moderationBlockMessage: submittedSettings.moderationBlockMessage,
    emailSmtpEnabled: submittedSettings.emailSmtpEnabled,
    emailSmtpHost: submittedSettings.emailSmtpHost,
    emailSmtpPort: submittedSettings.emailSmtpPort,
    emailSmtpSecure: submittedSettings.emailSmtpSecure,
    emailSmtpUser: submittedSettings.emailSmtpUser,
    emailFromEmail: submittedSettings.emailFromEmail,
    emailFromName: submittedSettings.emailFromName,
    emailReplyTo: submittedSettings.emailReplyTo,
    emailTestRecipient: submittedSettings.emailTestRecipient,
    emailSmtpPasswordConfigured: Boolean(returnedSettings.emailSmtpPasswordConfigured || submittedSettings.emailSmtpPasswordConfigured || emailSmtpPassword.trim()),
    deepseekApiKeyConfigured: Boolean(returnedSettings.deepseekApiKeyConfigured || submittedSettings.deepseekApiKeyConfigured || deepseekApiKey.trim()),
    legacyOpenaiApiKeyConfigured: Boolean(returnedSettings.legacyOpenaiApiKeyConfigured || submittedSettings.legacyOpenaiApiKeyConfigured || openaiApiKey.trim()),
    openaiApiKeyConfigured,
    stabilityAiApiKeyConfigured: Boolean(returnedSettings.stabilityAiApiKeyConfigured || submittedSettings.stabilityAiApiKeyConfigured || stabilityAiApiKey.trim()),
    encryptionReady: returnedSettings.encryptionReady,
    diagnostics: returnedSettings.diagnostics,
  };
}

async function readSettingsResponse(response: Response): Promise<SettingsResponse> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return (await response.json()) as SettingsResponse;
  const text = await response.text();
  return { ok: false, error: text.includes("<!DOCTYPE") ? "接口返回了 HTML 错误页，请查看服务端日志。" : text || "接口返回格式异常。" };
}

async function readChatGPTWebResponse(response: Response): Promise<ChatGPTWebStatusResponse> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return (await response.json()) as ChatGPTWebStatusResponse;
  const text = await response.text();
  return { ok: false, error: text.includes("<!DOCTYPE") ? "接口返回了 HTML 错误页，请查看服务端日志。" : text || "接口返回格式异常。" };
}

async function readOpenAIChannelCheckResponse(response: Response): Promise<OpenAIChannelCheckResponse> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return (await response.json()) as OpenAIChannelCheckResponse;
  const text = await response.text();
  return { ok: false, error: text.includes("<!DOCTYPE") ? "接口返回了 HTML 错误页，请查看服务端日志。" : text || "接口返回格式异常。" };
}

async function readEmailTestResponse(response: Response): Promise<EmailTestResponse> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return (await response.json()) as EmailTestResponse;
  const text = await response.text();
  return { ok: false, error: text.includes("<!DOCTYPE") ? "接口返回了 HTML 错误页，请查看服务端日志。" : text || "接口返回格式异常。" };
}

function diagnosticTheme(status: AdminDiagnosticStatus): "success" | "warning" | "danger" {
  if (status === "ok") return "success";
  if (status === "warning") return "warning";
  return "danger";
}

function diagnosticAlertTheme(status: AdminDiagnosticStatus): "success" | "warning" | "error" {
  if (status === "ok") return "success";
  if (status === "warning") return "warning";
  return "error";
}

export function AdminSettingsForm({ initialSettings }: { initialSettings: AdminAppSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [openaiChannels, setOpenaiChannels] = useState<EditableOpenAIChannel[]>(createEditableOpenAIChannels(initialSettings.openaiCompatibleChannels));
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [stabilityAiApiKey, setStabilityAiApiKey] = useState("");
  const [emailSmtpPassword, setEmailSmtpPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [chatgptMessage, setChatgptMessage] = useState("");
  const [chatgptError, setChatgptError] = useState("");
  const [openaiChannelCheckMessage, setOpenaiChannelCheckMessage] = useState("");
  const [openaiChannelCheckError, setOpenaiChannelCheckError] = useState("");
  const [emailTestMessage, setEmailTestMessage] = useState("");
  const [emailTestError, setEmailTestError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpeningChatGPT, setIsOpeningChatGPT] = useState(false);
  const [isCheckingChatGPT, setIsCheckingChatGPT] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [checkingOpenAIChannelId, setCheckingOpenAIChannelId] = useState("");

  function update<K extends keyof AdminAppSettings>(key: K, value: AdminAppSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateOpenAIChannel<K extends keyof EditableOpenAIChannel>(id: string, key: K, value: EditableOpenAIChannel[K]) {
    setOpenaiChannels((current) => current.map((channel) => (channel.id === id ? { ...channel, [key]: value } : channel)));
  }

  function addOpenAIChannel() {
    setOpenaiChannels((current) => {
      if (current.length >= 8) {
        setError("OpenAI 兼容通道最多 8 个。");
        return current;
      }
      return orderOpenAIChannels([...current, createOpenAIChannel(current.length)]);
    });
  }

  function removeOpenAIChannel(id: string) {
    setOpenaiChannels((current) => orderOpenAIChannels(current.filter((channel) => channel.id !== id)));
  }

  function moveOpenAIChannel(id: string, direction: -1 | 1) {
    setOpenaiChannels((current) => {
      const index = current.findIndex((channel) => channel.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return orderOpenAIChannels(next);
    });
  }

  async function handleSubmit() {
    setError("");
    setMessage("");
    setIsSaving(true);
    const submittedSettings = settings;
    const submittedChannels = openaiChannels;
    const submittedDeepseekApiKey = deepseekApiKey;
    const submittedOpenaiApiKey = openaiApiKey;
    const submittedStabilityAiApiKey = stabilityAiApiKey;
    const submittedEmailSmtpPassword = emailSmtpPassword;

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          browserTitle: settings.browserTitle,
          siteTitle: settings.siteTitle,
          siteSubtitle: settings.siteSubtitle,
          defaultGenerationProvider: settings.defaultGenerationProvider,
          deepseekBaseUrl: settings.deepseekBaseUrl,
          deepseekModel: settings.deepseekModel,
          deepseekPolishPrompt: settings.deepseekPolishPrompt,
          moderationEnabled: settings.moderationEnabled,
          moderationForbiddenWords: settings.moderationForbiddenWords,
          moderationBlockMessage: settings.moderationBlockMessage,
          openaiImageModel: settings.openaiImageModel,
          openaiCompatibleChannels: openaiChannels.map((channel, index) => ({
            id: channel.id,
            name: channel.name,
            enabled: channel.enabled,
            baseUrl: channel.baseUrl,
            model: channel.model,
            timeoutSeconds: channel.timeoutSeconds,
            priority: index,
            apiKey: channel.apiKey,
          })),
          stabilityAiModel: settings.stabilityAiModel,
          chatgptWebEnabled: settings.chatgptWebEnabled,
          chatgptWebUserDataDir: settings.chatgptWebUserDataDir,
          chatgptWebHeadless: settings.chatgptWebHeadless,
          chatgptWebTimeoutSeconds: settings.chatgptWebTimeoutSeconds,
          storageProvider: settings.storageProvider,
          storageLocalBaseDir: settings.storageLocalBaseDir,
          storagePublicBaseUrl: settings.storagePublicBaseUrl,
          storageGeneratedPrefix: settings.storageGeneratedPrefix,
          storageUploadsPrefix: settings.storageUploadsPrefix,
          storageEndpoint: settings.storageEndpoint,
          storageBucket: settings.storageBucket,
          storageRegion: settings.storageRegion,
          emailSmtpEnabled: settings.emailSmtpEnabled,
          emailSmtpHost: settings.emailSmtpHost,
          emailSmtpPort: settings.emailSmtpPort,
          emailSmtpSecure: settings.emailSmtpSecure,
          emailSmtpUser: settings.emailSmtpUser,
          emailSmtpPassword,
          emailFromEmail: settings.emailFromEmail,
          emailFromName: settings.emailFromName,
          emailReplyTo: settings.emailReplyTo,
          emailTestRecipient: settings.emailTestRecipient,
          deepseekApiKey,
          openaiApiKey,
          stabilityAiApiKey,
        }),
      });
      const data = await readSettingsResponse(response);

      if (!response.ok || !data.ok || !data.settings) throw new Error(data.error || "保存失败。");

      const mergedSettings = mergeSettingsAfterSave({
        returnedSettings: data.settings,
        submittedSettings,
        submittedChannels,
        deepseekApiKey: submittedDeepseekApiKey,
        openaiApiKey: submittedOpenaiApiKey,
        stabilityAiApiKey: submittedStabilityAiApiKey,
        emailSmtpPassword: submittedEmailSmtpPassword,
      });

      setSettings(mergedSettings);
      setOpenaiChannels(createEditableOpenAIChannels(mergedSettings.openaiCompatibleChannels));
      setDeepseekApiKey("");
      setOpenaiApiKey("");
      setStabilityAiApiKey("");
      setEmailSmtpPassword("");
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
      if (!response.ok || !data.ok || !data.status) throw new Error(data.error || "打开登录浏览器失败。");
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
      if (!response.ok || !data.ok || !data.status) throw new Error(data.error || "检测登录状态失败。");
      setChatgptMessage(data.status.message);
    } catch (caughtError) {
      setChatgptError(caughtError instanceof Error ? caughtError.message : "检测登录状态失败。");
    } finally {
      setIsCheckingChatGPT(false);
    }
  }

  async function checkOpenAIChannel(channelId: string) {
    setOpenaiChannelCheckError("");
    setOpenaiChannelCheckMessage("");
    setCheckingOpenAIChannelId(channelId);
    try {
      const response = await fetch("/api/admin/openai-compatible/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      const data = await readOpenAIChannelCheckResponse(response);
      if (!response.ok || !data.ok || !data.status) throw new Error(data.error || "通道连通性检查失败。");
      setOpenaiChannelCheckMessage(data.status.message);
    } catch (caughtError) {
      setOpenaiChannelCheckError(caughtError instanceof Error ? caughtError.message : "通道连通性检查失败。");
    } finally {
      setCheckingOpenAIChannelId("");
    }
  }

  async function sendTestEmail() {
    setEmailTestError("");
    setEmailTestMessage("");
    setIsTestingEmail(true);
    try {
      const response = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: settings.emailTestRecipient }),
      });
      const data = await readEmailTestResponse(response);
      if (!response.ok || !data.ok) throw new Error(data.error || "测试邮件发送失败。");
      setEmailTestMessage(data.message || "测试邮件已发送。");
    } catch (caughtError) {
      setEmailTestError(caughtError instanceof Error ? caughtError.message : "测试邮件发送失败。");
    } finally {
      setIsTestingEmail(false);
    }
  }

  async function logout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/signin?mode=admin";
  }

  return (
    <div className="admin-td-grid">
      {message ? <Alert theme="success" message={message} /> : null}
      {error ? <Alert theme="error" message={error} /> : null}

      <section className="admin-td-tabs-surface">
        <Tabs defaultValue="site" placement="top">
          <Tabs.TabPanel value="site" label="站点显示">
            <div className="admin-td-tab-panel">
              <Card className="admin-td-card" bordered title="站点显示">
                <Form labelAlign="top">
                  <SettingInput label="浏览器标题" value={settings.browserTitle} onChange={(value) => update("browserTitle", value)} />
                  <SettingInput label="网站标题" value={settings.siteTitle} onChange={(value) => update("siteTitle", value)} />
                  <SettingInput label="网站副标题" value={settings.siteSubtitle} onChange={(value) => update("siteSubtitle", value)} />
                </Form>
              </Card>
            </div>
          </Tabs.TabPanel>

          <Tabs.TabPanel value="generation" label="生图通道">
            <div className="admin-td-tab-panel">
              <Card className="admin-td-card" bordered title="基础生图配置">
                <Form labelAlign="top">
                  <Form.FormItem label="默认生图 Provider">
                    <Select
                      value={settings.defaultGenerationProvider}
                      options={[
                        { value: "chatgpt_web", label: "ChatGPT Web 本机浏览器" },
                        { value: "openai", label: "OpenAI 官方 API" },
                        { value: "stability_ai", label: "Stability AI（支持参考图）" },
                      ]}
                      onChange={(value) => update("defaultGenerationProvider", String(value) as GenerationProviderName)}
                    />
                  </Form.FormItem>
                  <SettingInput label="OpenAI 图像模型" value={settings.openaiImageModel} onChange={(value) => update("openaiImageModel", value)} />
                  <SettingInput
                    label="旧版 OpenAI API Key"
                    value={openaiApiKey}
                    onChange={setOpenaiApiKey}
                    placeholder={settings.legacyOpenaiApiKeyConfigured ? "已配置，留空表示不修改" : "未配置"}
                    type="password"
                  />
                  <p className="admin-td-form-hint">未配置兼容通道列表时，会自动使用这里的旧版单通道配置。</p>
                </Form>
              </Card>

              <Card className="admin-td-card" bordered title="OpenAI 兼容中转通道" actions={<Button type="button" variant="outline" onClick={addOpenAIChannel}>新增通道</Button>}>
                <div className="admin-td-tab-panel-grid">
                  {openaiChannels.map((channel, index) => (
                    <Card key={channel.id} className="admin-td-card admin-td-channel-card" bordered title={`${index + 1}. ${channel.name}`}>
                      <div className="admin-td-channel-toolbar">
                        <div className="admin-td-channel-state">
                          <Switch value={channel.enabled} onChange={(value) => updateOpenAIChannel(channel.id, "enabled", Boolean(value))} />
                          <span>{channel.enabled ? "已启用" : "已停用"}</span>
                        </div>
                        <div className="admin-td-action-row">
                          <Button
                            size="small"
                            type="button"
                            variant="outline"
                            loading={checkingOpenAIChannelId === channel.id}
                            disabled={!channel.enabled || !channel.apiKeyConfigured}
                            onClick={() => void checkOpenAIChannel(channel.id)}
                          >
                            检测
                          </Button>
                          <Button size="small" type="button" variant="outline" disabled={index === 0} onClick={() => moveOpenAIChannel(channel.id, -1)}>上移</Button>
                          <Button size="small" type="button" variant="outline" disabled={index === openaiChannels.length - 1} onClick={() => moveOpenAIChannel(channel.id, 1)}>下移</Button>
                          <Button size="small" type="button" theme="danger" variant="outline" onClick={() => removeOpenAIChannel(channel.id)}>删除</Button>
                        </div>
                      </div>
                      <Form labelAlign="top">
                        <SettingInput label="名称" value={channel.name} onChange={(value) => updateOpenAIChannel(channel.id, "name", value)} />
                        <SettingInput label="模型" value={channel.model} onChange={(value) => updateOpenAIChannel(channel.id, "model", value)} />
                        <SettingInput label="Base URL" value={channel.baseUrl} onChange={(value) => updateOpenAIChannel(channel.id, "baseUrl", value)} placeholder="https://example.com/v1" />
                        <SettingInput
                          label="API Key"
                          value={channel.apiKey}
                          onChange={(value) => updateOpenAIChannel(channel.id, "apiKey", value)}
                          placeholder={channel.apiKeyConfigured ? "已配置，留空表示不修改" : "未配置"}
                          type="password"
                        />
                        <Form.FormItem label="超时秒数">
                          <InputNumber value={channel.timeoutSeconds} min={30} max={900} onChange={(value) => updateOpenAIChannel(channel.id, "timeoutSeconds", Number(value || 120))} />
                        </Form.FormItem>
                      </Form>
                    </Card>
                  ))}
                </div>
                {openaiChannelCheckMessage ? <Alert className="admin-td-form-section" theme="success" message={openaiChannelCheckMessage} /> : null}
                {openaiChannelCheckError ? <Alert className="admin-td-form-section" theme="error" message={openaiChannelCheckError} /> : null}
              </Card>

              <Card className="admin-td-card" bordered title="Stability AI">
                <Form labelAlign="top">
                  <SettingInput label="Stability AI 模型" value={settings.stabilityAiModel} onChange={(value) => update("stabilityAiModel", value)} />
                  <SettingInput
                    label="Stability AI API Key"
                    value={stabilityAiApiKey}
                    onChange={setStabilityAiApiKey}
                    placeholder={settings.stabilityAiApiKeyConfigured ? "已配置，留空表示不修改" : "未配置"}
                    type="password"
                  />
                </Form>
              </Card>
            </div>
          </Tabs.TabPanel>

          <Tabs.TabPanel value="safety" label="安全与存储">
            <div className="admin-td-tab-panel-grid">
              <Card className="admin-td-card" bordered title="内容安全">
                <Form labelAlign="top">
                  <Form.FormItem label="启用违禁词拦截">
                    <Switch value={settings.moderationEnabled} onChange={(value) => update("moderationEnabled", Boolean(value))} />
                  </Form.FormItem>
                  <SettingInput label="违禁词词库" value={settings.moderationForbiddenWords} onChange={(value) => update("moderationForbiddenWords", value)} textarea minRows={8} />
                  <SettingInput label="拦截提示文案" value={settings.moderationBlockMessage} onChange={(value) => update("moderationBlockMessage", value)} />
                </Form>
              </Card>

              <Card className="admin-td-card" bordered title="图片存储">
                <Form labelAlign="top">
                  <Form.FormItem label="存储类型">
                    <Select
                      value={settings.storageProvider}
                      options={[
                        { value: "local", label: "Local 本地存储" },
                        { value: "oss", label: "阿里云 OSS（预留）" },
                        { value: "cos", label: "腾讯云 COS（预留）" },
                        { value: "s3", label: "S3 兼容存储（预留）" },
                      ]}
                      onChange={(value) => update("storageProvider", String(value) as StorageProviderName)}
                    />
                  </Form.FormItem>
                  <SettingInput label="本地根目录" value={settings.storageLocalBaseDir} onChange={(value) => update("storageLocalBaseDir", value)} placeholder="public/storage" />
                  <SettingInput label="公开访问域名" value={settings.storagePublicBaseUrl} onChange={(value) => update("storagePublicBaseUrl", value)} placeholder="留空使用当前站点相对路径" />
                  <SettingInput label="生成图前缀" value={settings.storageGeneratedPrefix} onChange={(value) => update("storageGeneratedPrefix", value)} />
                  <SettingInput label="上传图前缀" value={settings.storageUploadsPrefix} onChange={(value) => update("storageUploadsPrefix", value)} />
                  <SettingInput label="Endpoint" value={settings.storageEndpoint} onChange={(value) => update("storageEndpoint", value)} placeholder="预留" />
                  <SettingInput label="Bucket" value={settings.storageBucket} onChange={(value) => update("storageBucket", value)} placeholder="预留" />
                  <SettingInput label="Region" value={settings.storageRegion} onChange={(value) => update("storageRegion", value)} placeholder="预留" />
                </Form>
              </Card>
            </div>
          </Tabs.TabPanel>

          <Tabs.TabPanel value="polish" label="润色与浏览器">
            <div className="admin-td-tab-panel-grid">
              <Card className="admin-td-card" bordered title="DeepSeek 润色接口">
                <Form labelAlign="top">
                  <SettingInput label="Base URL" value={settings.deepseekBaseUrl} onChange={(value) => update("deepseekBaseUrl", value)} />
                  <SettingInput label="模型" value={settings.deepseekModel} onChange={(value) => update("deepseekModel", value)} />
                  <SettingInput
                    label="DeepSeek API Key"
                    value={deepseekApiKey}
                    onChange={setDeepseekApiKey}
                    placeholder={settings.deepseekApiKeyConfigured ? "已配置，留空表示不修改" : "未配置"}
                    type="password"
                  />
                  <SettingInput label="润色系统提示词" value={settings.deepseekPolishPrompt} onChange={(value) => update("deepseekPolishPrompt", value)} textarea minRows={9} />
                </Form>
              </Card>

              <Card className="admin-td-card" bordered title="网页版 ChatGPT">
                <Form labelAlign="top">
                  <Form.FormItem label="启用 ChatGPT Web">
                    <Switch value={settings.chatgptWebEnabled} onChange={(value) => update("chatgptWebEnabled", Boolean(value))} />
                  </Form.FormItem>
                  <SettingInput label="浏览器 Profile 路径" value={settings.chatgptWebUserDataDir} onChange={(value) => update("chatgptWebUserDataDir", value)} />
                  <Form.FormItem label="无头模式">
                    <Switch value={settings.chatgptWebHeadless} onChange={(value) => update("chatgptWebHeadless", Boolean(value))} />
                  </Form.FormItem>
                  <Form.FormItem label="超时时间（秒）">
                    <InputNumber value={settings.chatgptWebTimeoutSeconds} min={30} max={900} onChange={(value) => update("chatgptWebTimeoutSeconds", Number(value || 120))} />
                  </Form.FormItem>
                  <div className="admin-td-action-row">
                    <Button type="button" variant="outline" loading={isOpeningChatGPT} onClick={() => void openChatGPTLoginBrowser()}>打开登录浏览器</Button>
                    <Button type="button" theme="primary" loading={isCheckingChatGPT} onClick={() => void checkChatGPTStatus()}>检测登录状态</Button>
                  </div>
                </Form>
                {chatgptMessage ? <Alert className="admin-td-form-section" theme="success" message={chatgptMessage} /> : null}
                {chatgptError ? <Alert className="admin-td-form-section" theme="error" message={chatgptError} /> : null}
              </Card>
            </div>
          </Tabs.TabPanel>

          <Tabs.TabPanel value="email" label="邮件发信">
            <div className="admin-td-tab-panel-grid">
              <Card className="admin-td-card" bordered title="SMTP 发信配置">
                <Form labelAlign="top">
                  <Form.FormItem label="启用 SMTP 发信">
                    <Switch value={settings.emailSmtpEnabled} onChange={(value) => update("emailSmtpEnabled", Boolean(value))} />
                  </Form.FormItem>
                  <SettingInput label="SMTP Host" value={settings.emailSmtpHost} onChange={(value) => update("emailSmtpHost", value)} placeholder="smtp.example.com" />
                  <Form.FormItem label="SMTP 端口">
                    <InputNumber value={settings.emailSmtpPort} min={1} max={65535} onChange={(value) => update("emailSmtpPort", Number(value || 465))} />
                  </Form.FormItem>
                  <Form.FormItem label="SSL/TLS">
                    <Switch value={settings.emailSmtpSecure} onChange={(value) => update("emailSmtpSecure", Boolean(value))} />
                  </Form.FormItem>
                  <SettingInput label="SMTP 用户名" value={settings.emailSmtpUser} onChange={(value) => update("emailSmtpUser", value)} placeholder="通常为邮箱账号" />
                  <SettingInput
                    label="SMTP 密码/授权码"
                    value={emailSmtpPassword}
                    onChange={setEmailSmtpPassword}
                    placeholder={settings.emailSmtpPasswordConfigured ? "已配置，留空表示不修改" : "未配置"}
                    type="password"
                  />
                  <SettingInput label="发件邮箱" value={settings.emailFromEmail} onChange={(value) => update("emailFromEmail", value)} placeholder="noreply@example.com" />
                  <SettingInput label="发件人名称" value={settings.emailFromName} onChange={(value) => update("emailFromName", value)} />
                  <SettingInput label="回复邮箱" value={settings.emailReplyTo} onChange={(value) => update("emailReplyTo", value)} placeholder="可留空" />
                </Form>
              </Card>

              <Card className="admin-td-card" bordered title="发信测试">
                <Form labelAlign="top">
                  <SettingInput label="测试收件邮箱" value={settings.emailTestRecipient} onChange={(value) => update("emailTestRecipient", value)} placeholder="留空则发送到发件邮箱" />
                  <div className="admin-td-action-row">
                    <Button type="button" theme="primary" loading={isTestingEmail} onClick={() => void sendTestEmail()}>
                      发送测试邮件
                    </Button>
                  </div>
                </Form>
                {emailTestMessage ? <Alert className="admin-td-form-section" theme="success" message={emailTestMessage} /> : null}
                {emailTestError ? <Alert className="admin-td-form-section" theme="error" message={emailTestError} /> : null}
                <p className="admin-td-form-hint">请先保存 SMTP 配置，再发送测试邮件。多数邮箱服务需要使用客户端授权码，而不是登录密码。</p>
              </Card>
            </div>
          </Tabs.TabPanel>

          <Tabs.TabPanel value="diagnostics" label="配置检测">
            <div className="admin-td-tab-panel">
              <Card className="admin-td-card" bordered title="配置检测" actions={<Button type="button" variant="outline" loading={isLoggingOut} onClick={() => void logout()}>退出登录</Button>}>
                <div className="admin-td-diagnostic-list">
                  {settings.diagnostics.map((item) => (
                    <Alert
                      key={item.key}
                      theme={diagnosticAlertTheme(item.status)}
                      message={
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <Tag theme={diagnosticTheme(item.status)} variant="light">{item.status}</Tag>
                            <strong>{item.label}</strong>
                          </div>
                          <p className="admin-td-cell-sub">{item.message}</p>
                        </div>
                      }
                    />
                  ))}
                </div>
              </Card>
            </div>
          </Tabs.TabPanel>
        </Tabs>
      </section>

      <div className="admin-td-form-footer">
        <Button theme="primary" size="large" type="button" loading={isSaving} onClick={() => void handleSubmit()}>
          {isSaving ? "保存中" : "保存配置"}
        </Button>
      </div>
    </div>
  );
}

function SettingInput({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  type,
  minRows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  type?: "number" | "search" | "url" | "text" | "tel" | "hidden" | "submit" | "password";
  minRows?: number;
}) {
  return (
    <Form.FormItem label={label}>
      {textarea ? (
        <Textarea value={value} placeholder={placeholder} autosize={{ minRows, maxRows: Math.max(minRows + 2, 6) }} onChange={(nextValue) => onChange(String(nextValue))} />
      ) : (
        <Input value={value} type={type} placeholder={placeholder} onChange={(nextValue) => onChange(String(nextValue))} />
      )}
    </Form.FormItem>
  );
}
