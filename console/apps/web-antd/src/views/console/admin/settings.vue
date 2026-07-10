<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Form,
  FormItem,
  Input,
  InputNumber,
  InputPassword,
  message,
  Modal,
  Select,
  Skeleton,
  Space,
  Spin,
  Switch,
  TabPane,
  Tabs,
  Tag,
  Textarea,
} from 'ant-design-vue';

import { adminRequestClient } from '#/api/admin-request';

defineOptions({ name: 'AdminSettings' });

/** ========== 类型（对齐旧版 src/lib/settings.ts 的序列化视图） ========== */

type GenerationProviderName = 'chatgpt_web' | 'openai' | 'stability_ai';
type StorageProviderName = 'cos' | 'local' | 'oss' | 's3';
type FrontTemplateName = 'glass_app' | 'tdesign_workspace';
type HomePopupContentFormat = 'html' | 'markdown';
type AdminDiagnosticStatus = 'error' | 'ok' | 'warning';

interface FooterFriendLink {
  href: string;
  label: string;
}

interface HomePopupSettings {
  content: string;
  contentFormat: HomePopupContentFormat;
  enabled: boolean;
  title: string;
}

interface OpenAICompatibleChannelSetting {
  apiKeyConfigured: boolean;
  baseUrl: string;
  enabled: boolean;
  id: string;
  model: string;
  name: string;
  priority: number;
  timeoutSeconds: number;
}

/** 编辑态通道：额外携带一个仅本地输入的 apiKey（留空表示不修改） */
interface EditableOpenAIChannel extends OpenAICompatibleChannelSetting {
  apiKey: string;
}

interface AdminDiagnosticItem {
  key: string;
  label: string;
  message: string;
  status: AdminDiagnosticStatus;
}

interface AdminAppSettings {
  browserTitle: string;
  chatgptWebEnabled: boolean;
  chatgptWebHeadless: boolean;
  chatgptWebTimeoutSeconds: number;
  chatgptWebUserDataDir: string;
  deepseekApiKeyConfigured: boolean;
  deepseekBaseUrl: string;
  deepseekModel: string;
  deepseekPolishPrompt: string;
  defaultGenerationProvider: GenerationProviderName;
  diagnostics: AdminDiagnosticItem[];
  emailFromEmail: string;
  emailFromName: string;
  emailReplyTo: string;
  emailSmtpEnabled: boolean;
  emailSmtpHost: string;
  emailSmtpPasswordConfigured: boolean;
  emailSmtpPort: number;
  emailSmtpSecure: boolean;
  emailSmtpUser: string;
  emailTestRecipient: string;
  encryptionReady: boolean;
  friendLinks: FooterFriendLink[];
  frontTemplate: FrontTemplateName;
  homePopup: HomePopupSettings;
  icpNumber: string;
  legacyOpenaiApiKeyConfigured: boolean;
  moderationBlockMessage: string;
  moderationEnabled: boolean;
  moderationForbiddenWords: string;
  openaiApiKeyConfigured: boolean;
  openaiCompatibleChannels: OpenAICompatibleChannelSetting[];
  openaiImageModel: string;
  openaiVisionModel: string;
  referenceImageRetentionDays: number;
  referenceImagesEnabled: boolean;
  siteFaviconUrl: string;
  siteLogoUrl: string;
  siteSubtitle: string;
  siteTitle: string;
  stabilityAiApiKeyConfigured: boolean;
  stabilityAiModel: string;
  storageAccessKeyIdConfigured: boolean;
  storageForcePathStyle: boolean;
  storageSecretAccessKeyConfigured: boolean;
  storageBucket: string;
  storageEndpoint: string;
  storageGeneratedPrefix: string;
  storageLocalBaseDir: string;
  storageProvider: StorageProviderName;
  storagePublicBaseUrl: string;
  storageRegion: string;
  storageUploadsPrefix: string;
}

interface ChannelPayload {
  apiKey?: string;
  baseUrl: string;
  enabled: boolean;
  id: string;
  model: string;
  name: string;
  priority: number;
  timeoutSeconds: number;
}

/** POST /admin/settings 提交体：密钥字段仅在用户输入非空时携带 */
interface SaveSettingsPayload {
  browserTitle: string;
  chatgptWebEnabled: boolean;
  chatgptWebHeadless: boolean;
  chatgptWebTimeoutSeconds: number;
  chatgptWebUserDataDir: string;
  deepseekApiKey?: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
  deepseekPolishPrompt: string;
  defaultGenerationProvider: GenerationProviderName;
  emailFromEmail: string;
  emailFromName: string;
  emailReplyTo: string;
  emailSmtpEnabled: boolean;
  emailSmtpHost: string;
  emailSmtpPassword?: string;
  emailSmtpPort: number;
  emailSmtpSecure: boolean;
  emailSmtpUser: string;
  emailTestRecipient: string;
  friendLinks: FooterFriendLink[];
  frontTemplate: FrontTemplateName;
  homePopup: HomePopupSettings;
  icpNumber: string;
  moderationBlockMessage: string;
  moderationEnabled: boolean;
  moderationForbiddenWords: string;
  openaiApiKey?: string;
  openaiCompatibleChannels: ChannelPayload[];
  openaiImageModel: string;
  openaiVisionModel: string;
  referenceImageRetentionDays: number;
  referenceImagesEnabled: boolean;
  siteFaviconUrl: string;
  siteLogoUrl: string;
  siteSubtitle: string;
  siteTitle: string;
  stabilityAiApiKey?: string;
  stabilityAiModel: string;
  storageAccessKeyId?: string;
  storageForcePathStyle?: boolean;
  storageSecretAccessKey?: string;
  storageBucket: string;
  storageEndpoint: string;
  storageGeneratedPrefix: string;
  storageLocalBaseDir: string;
  storageProvider: StorageProviderName;
  storagePublicBaseUrl: string;
  storageRegion: string;
  storageUploadsPrefix: string;
}

interface ChatGPTWebStatus {
  enabled: boolean;
  headless: boolean;
  message: string;
  ready: boolean;
  timeoutSeconds: number;
  userDataDir: string;
}

interface OpenAIChannelCheckStatus {
  channelId: string;
  channelName: string;
  checkedUrl: string;
  message: string;
}

interface ResultAlert {
  text: string;
  type: 'error' | 'success' | 'warning';
}

interface SelectOptionItem {
  label: string;
  value: string;
}

/** ========== 常量 ========== */

const PROVIDER_OPTIONS: SelectOptionItem[] = [
  { label: 'ChatGPT Web 本机浏览器', value: 'chatgpt_web' },
  { label: 'OpenAI 官方 API', value: 'openai' },
  { label: 'Stability AI（支持参考图）', value: 'stability_ai' },
];

const STORAGE_OPTIONS: SelectOptionItem[] = [
  { label: 'Local 本地存储', value: 'local' },
  { label: '阿里云 OSS（预留）', value: 'oss' },
  { label: '腾讯云 COS（预留）', value: 'cos' },
  { label: 'S3 兼容存储（预留）', value: 's3' },
];

const POPUP_FORMAT_OPTIONS: SelectOptionItem[] = [
  { label: 'Markdown', value: 'markdown' },
  { label: 'HTML5', value: 'html' },
];

const DIAGNOSTIC_TAG_COLORS: Record<AdminDiagnosticStatus, string> = {
  error: 'error',
  ok: 'success',
  warning: 'warning',
};

const DIAGNOSTIC_ALERT_TYPES: Record<
  AdminDiagnosticStatus,
  'error' | 'success' | 'warning'
> = {
  error: 'error',
  ok: 'success',
  warning: 'warning',
};

/** ========== 状态 ========== */

function createDefaultSettings(): AdminAppSettings {
  return {
    browserTitle: '',
    chatgptWebEnabled: false,
    chatgptWebHeadless: true,
    chatgptWebTimeoutSeconds: 120,
    chatgptWebUserDataDir: '',
    deepseekApiKeyConfigured: false,
    deepseekBaseUrl: '',
    deepseekModel: '',
    deepseekPolishPrompt: '',
    defaultGenerationProvider: 'openai',
    diagnostics: [],
    emailFromEmail: '',
    emailFromName: '',
    emailReplyTo: '',
    emailSmtpEnabled: false,
    emailSmtpHost: '',
    emailSmtpPasswordConfigured: false,
    emailSmtpPort: 465,
    emailSmtpSecure: true,
    emailSmtpUser: '',
    emailTestRecipient: '',
    encryptionReady: true,
    friendLinks: [],
    frontTemplate: 'tdesign_workspace',
    homePopup: { content: '', contentFormat: 'markdown', enabled: false, title: '' },
    icpNumber: '',
    legacyOpenaiApiKeyConfigured: false,
    moderationBlockMessage: '',
    moderationEnabled: false,
    moderationForbiddenWords: '',
    openaiApiKeyConfigured: false,
    openaiCompatibleChannels: [],
    openaiImageModel: '',
    openaiVisionModel: '',
    referenceImageRetentionDays: 30,
    referenceImagesEnabled: false,
    siteFaviconUrl: '',
    siteLogoUrl: '',
    siteSubtitle: '',
    siteTitle: '',
    stabilityAiApiKeyConfigured: false,
    stabilityAiModel: '',
    storageAccessKeyIdConfigured: false,
    storageForcePathStyle: false,
    storageSecretAccessKeyConfigured: false,
    storageBucket: '',
    storageEndpoint: '',
    storageGeneratedPrefix: '',
    storageLocalBaseDir: '',
    storageProvider: 'local',
    storagePublicBaseUrl: '',
    storageRegion: '',
    storageUploadsPrefix: '',
  };
}

const activeTab = ref('site');
const loading = ref(false);
const saving = ref(false);
const loaded = ref(false);

const form = reactive<AdminAppSettings>(createDefaultSettings());
const channels = ref<EditableOpenAIChannel[]>([]);
const friendLinksText = ref('');

/** 敏感密钥输入框：留空表示不修改 */
const openaiApiKey = ref('');
const stabilityAiApiKey = ref('');
const storageAccessKeyId = ref('');
const storageSecretAccessKey = ref('');
const deepseekApiKey = ref('');
const emailSmtpPassword = ref('');

/** 辅助操作 loading 与结果提示 */
const checkingChannelId = ref('');
const channelCheckResult = ref<null | ResultAlert>(null);
const checkingChatgpt = ref(false);
const openingChatgpt = ref(false);
const chatgptResult = ref<null | ResultAlert>(null);
const testingEmail = ref(false);
const emailTestResult = ref<null | ResultAlert>(null);

const homePopupContentPlaceholder = computed(() =>
  form.homePopup.contentFormat === 'html'
    ? '<section><h2>活动公告</h2><p>这里填写 HTML5 内容。</p></section>'
    : '## 活动公告\n这里填写 Markdown 内容，支持链接、列表、图片等常用格式。',
);

/** ========== 工具函数 ========== */

function extractErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { error?: string } } })
      .response;
    if (response?.data?.error) {
      return response.data.error;
    }
    const msg = (error as { message?: string }).message;
    if (msg) {
      return msg;
    }
  }
  return fallback;
}

function formatFriendLinks(links: FooterFriendLink[]) {
  return links.map((link) => `${link.label} | ${link.href}`).join('\n');
}

function parseFriendLinkLine(line: string): FooterFriendLink | null {
  const pipeParts = line.split(/[|｜]/);
  if (pipeParts.length >= 2) {
    return {
      href: pipeParts.slice(1).join('|').trim(),
      label: (pipeParts[0] ?? '').trim(),
    };
  }

  const commaParts = line.split(/[，,]/);
  if (commaParts.length >= 2) {
    return {
      href: commaParts.slice(1).join(',').trim(),
      label: (commaParts[0] ?? '').trim(),
    };
  }

  const urlMatch = line.match(/\s+(https?:\/\/\S+|www\.\S+|\/\S*|#\S+)$/);
  if (urlMatch?.index) {
    return {
      href: (urlMatch[1] ?? '').trim(),
      label: line.slice(0, urlMatch.index).trim(),
    };
  }

  return null;
}

function normalizeFriendLinkHref(value: string) {
  const clean = value.trim().slice(0, 300);
  if (!clean) return '';
  if (clean.startsWith('/') || clean.startsWith('#')) return clean;
  if (clean.startsWith('www.')) return `https://${clean}`;

  try {
    const url = new URL(clean);
    return url.protocol === 'http:' || url.protocol === 'https:' ? clean : '';
  } catch {
    return '';
  }
}

function parseFriendLinksText(value: string): {
  error: string;
  links: FooterFriendLink[];
} {
  const seen = new Set<string>();
  const invalidLines: string[] = [];

  const links = value
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parsed = parseFriendLinkLine(line);
      if (!parsed) {
        invalidLines.push(line);
        return null;
      }

      const label = parsed.label.slice(0, 40);
      const href = normalizeFriendLinkHref(parsed.href);

      if (!label || !href) {
        invalidLines.push(line);
        return null;
      }

      const key = `${label}|${href}`.toLocaleLowerCase();
      if (seen.has(key)) {
        return null;
      }
      seen.add(key);

      return { href, label };
    })
    .filter((link): link is FooterFriendLink => Boolean(link))
    .slice(0, 8);

  return {
    error: invalidLines.length
      ? `友情链接格式不正确：${invalidLines.slice(0, 2).join('；')}。请按“名称 | 链接”填写。`
      : '',
    links,
  };
}

/** ========== 通道列表编辑 ========== */

function reorderChannels(list: EditableOpenAIChannel[]) {
  return list.map((channel, index) => ({ ...channel, priority: index }));
}

function createChannel(index: number): EditableOpenAIChannel {
  return {
    apiKey: '',
    apiKeyConfigured: false,
    baseUrl: 'https://api.openai.com/v1',
    enabled: true,
    id: `openai-compatible-${Date.now()}-${index + 1}`,
    model: 'gpt-image-2',
    name: `中转站 ${index + 1}`,
    priority: index,
    timeoutSeconds: 120,
  };
}

function addChannel() {
  if (channels.value.length >= 8) {
    message.error('OpenAI 兼容通道最多 8 个。');
    return;
  }
  channels.value = reorderChannels([
    ...channels.value,
    createChannel(channels.value.length),
  ]);
}

function moveChannel(id: string, direction: -1 | 1) {
  const index = channels.value.findIndex((channel) => channel.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= channels.value.length) {
    return;
  }
  const next = [...channels.value];
  const [item] = next.splice(index, 1);
  if (!item) return;
  next.splice(nextIndex, 0, item);
  channels.value = reorderChannels(next);
}

function removeChannel(channel: EditableOpenAIChannel) {
  Modal.confirm({
    cancelText: '再想想',
    content: `删除后通道「${channel.name}」及其已保存的 API Key 将在点击「保存全部设置」后移除，确定删除吗？`,
    okText: '确认删除',
    okType: 'danger',
    title: '删除兼容通道',
    onOk: () => {
      channels.value = reorderChannels(
        channels.value.filter((item) => item.id !== channel.id),
      );
    },
  });
}

/** ========== 数据加载与保存 ========== */

function applySettings(next: AdminAppSettings) {
  Object.assign(form, next, {
    diagnostics: [...next.diagnostics],
    friendLinks: [...next.friendLinks],
    homePopup: { ...next.homePopup },
    openaiCompatibleChannels: [...next.openaiCompatibleChannels],
  });
  channels.value = [...next.openaiCompatibleChannels]
    .sort((a, b) => a.priority - b.priority)
    .map((channel) => ({ ...channel, apiKey: '' }));
  friendLinksText.value = formatFriendLinks(next.friendLinks);
  openaiApiKey.value = '';
  stabilityAiApiKey.value = '';
  storageAccessKeyId.value = '';
  storageSecretAccessKey.value = '';
  deepseekApiKey.value = '';
  emailSmtpPassword.value = '';
}

async function loadSettings() {
  loading.value = true;
  try {
    const data = await adminRequestClient.get<{
      ok: boolean;
      settings: AdminAppSettings;
    }>('/admin/settings');
    applySettings(data.settings);
    loaded.value = true;
  } catch {
    // adminRequestClient 已统一 message.error，这里只收敛 loading 态
  } finally {
    loading.value = false;
  }
}

function confirmReload() {
  Modal.confirm({
    cancelText: '取消',
    content: '重新加载会丢弃当前未保存的修改，确定继续吗？',
    okText: '重新加载',
    title: '重新加载配置',
    onOk: async () => {
      await loadSettings();
      message.success('已重新加载服务端配置');
    },
  });
}

function buildPayload(friendLinks: FooterFriendLink[]): SaveSettingsPayload {
  const payload: SaveSettingsPayload = {
    browserTitle: form.browserTitle,
    chatgptWebEnabled: form.chatgptWebEnabled,
    chatgptWebHeadless: form.chatgptWebHeadless,
    // InputNumber 清空时可能得到 null，这里兜底为旧版默认值
    chatgptWebTimeoutSeconds: Number(form.chatgptWebTimeoutSeconds || 120),
    chatgptWebUserDataDir: form.chatgptWebUserDataDir,
    deepseekBaseUrl: form.deepseekBaseUrl,
    deepseekModel: form.deepseekModel,
    deepseekPolishPrompt: form.deepseekPolishPrompt,
    defaultGenerationProvider: form.defaultGenerationProvider,
    emailFromEmail: form.emailFromEmail,
    emailFromName: form.emailFromName,
    emailReplyTo: form.emailReplyTo,
    emailSmtpEnabled: form.emailSmtpEnabled,
    emailSmtpHost: form.emailSmtpHost,
    emailSmtpPort: Number(form.emailSmtpPort || 465),
    emailSmtpSecure: form.emailSmtpSecure,
    emailSmtpUser: form.emailSmtpUser,
    emailTestRecipient: form.emailTestRecipient,
    friendLinks,
    frontTemplate: form.frontTemplate,
    homePopup: { ...form.homePopup },
    icpNumber: form.icpNumber,
    moderationBlockMessage: form.moderationBlockMessage,
    moderationEnabled: form.moderationEnabled,
    moderationForbiddenWords: form.moderationForbiddenWords,
    openaiCompatibleChannels: channels.value.map((channel, index) => {
      const item: ChannelPayload = {
        baseUrl: channel.baseUrl,
        enabled: channel.enabled,
        id: channel.id,
        model: channel.model,
        name: channel.name,
        priority: index,
        timeoutSeconds: Number(channel.timeoutSeconds || 120),
      };
      if (channel.apiKey.trim()) {
        item.apiKey = channel.apiKey;
      }
      return item;
    }),
    openaiImageModel: form.openaiImageModel,
    openaiVisionModel: form.openaiVisionModel,
    // InputNumber 清空时可能得到 null，这里兜底为默认保留天数
    referenceImageRetentionDays: Number(form.referenceImageRetentionDays || 30),
    referenceImagesEnabled: form.referenceImagesEnabled,
    siteFaviconUrl: form.siteFaviconUrl,
    siteLogoUrl: form.siteLogoUrl,
    siteSubtitle: form.siteSubtitle,
    siteTitle: form.siteTitle,
    stabilityAiModel: form.stabilityAiModel,
    storageBucket: form.storageBucket,
    storageEndpoint: form.storageEndpoint,
    storageGeneratedPrefix: form.storageGeneratedPrefix,
    storageLocalBaseDir: form.storageLocalBaseDir,
    storageForcePathStyle: form.storageForcePathStyle,
    storageProvider: form.storageProvider,
    storagePublicBaseUrl: form.storagePublicBaseUrl,
    storageRegion: form.storageRegion,
    storageUploadsPrefix: form.storageUploadsPrefix,
  };

  // 密钥字段：仅在输入非空时携带，留空表示不修改
  if (openaiApiKey.value.trim()) payload.openaiApiKey = openaiApiKey.value;
  if (stabilityAiApiKey.value.trim()) {
    payload.stabilityAiApiKey = stabilityAiApiKey.value;
  }
  if (storageAccessKeyId.value.trim()) {
    payload.storageAccessKeyId = storageAccessKeyId.value;
  }
  if (storageSecretAccessKey.value.trim()) {
    payload.storageSecretAccessKey = storageSecretAccessKey.value;
  }
  if (deepseekApiKey.value.trim()) {
    payload.deepseekApiKey = deepseekApiKey.value;
  }
  if (emailSmtpPassword.value.trim()) {
    payload.emailSmtpPassword = emailSmtpPassword.value;
  }

  return payload;
}

async function handleSave() {
  const parsed = parseFriendLinksText(friendLinksText.value);
  if (parsed.error) {
    message.error(parsed.error);
    return;
  }

  saving.value = true;
  try {
    const data = await adminRequestClient.post<{
      ok: boolean;
      settings: AdminAppSettings;
    }>('/admin/settings', buildPayload(parsed.links));
    applySettings(data.settings);
    message.success('配置已保存');
  } catch {
    // 错误已由 adminRequestClient 统一提示
  } finally {
    saving.value = false;
  }
}

/** ========== 辅助接口：通道检测 / ChatGPT Web / 发信测试 ========== */

async function checkChannel(channel: EditableOpenAIChannel) {
  checkingChannelId.value = channel.id;
  channelCheckResult.value = null;
  try {
    const data = await adminRequestClient.post<{
      ok: boolean;
      status: OpenAIChannelCheckStatus;
    }>('/admin/openai-compatible/check', { channelId: channel.id });
    channelCheckResult.value = {
      text: `${data.status.message}（${data.status.checkedUrl}）`,
      type: 'success',
    };
  } catch (error) {
    channelCheckResult.value = {
      text: extractErrorMessage(error, '通道连通性检查失败。'),
      type: 'error',
    };
  } finally {
    checkingChannelId.value = '';
  }
}

async function checkChatGPTStatus() {
  checkingChatgpt.value = true;
  chatgptResult.value = null;
  try {
    const data = await adminRequestClient.post<{
      ok: boolean;
      status: ChatGPTWebStatus;
    }>('/admin/chatgpt-web/check');
    chatgptResult.value = {
      text: data.status.message,
      type: data.status.ready ? 'success' : 'warning',
    };
  } catch (error) {
    chatgptResult.value = {
      text: extractErrorMessage(error, '检测登录状态失败。'),
      type: 'error',
    };
  } finally {
    checkingChatgpt.value = false;
  }
}

async function openChatGPTLoginBrowser() {
  openingChatgpt.value = true;
  chatgptResult.value = null;
  try {
    const data = await adminRequestClient.post<{
      ok: boolean;
      status: ChatGPTWebStatus;
    }>('/admin/chatgpt-web/open-login');
    chatgptResult.value = { text: data.status.message, type: 'success' };
  } catch (error) {
    chatgptResult.value = {
      text: extractErrorMessage(error, '打开登录浏览器失败。'),
      type: 'error',
    };
  } finally {
    openingChatgpt.value = false;
  }
}

async function sendTestEmail() {
  testingEmail.value = true;
  emailTestResult.value = null;
  try {
    const data = await adminRequestClient.post<{
      message?: string;
      ok: boolean;
      recipient?: string;
    }>('/admin/email/test', { to: form.emailTestRecipient });
    emailTestResult.value = {
      text: data.message || '测试邮件已发送。',
      type: 'success',
    };
  } catch (error) {
    emailTestResult.value = {
      text: extractErrorMessage(error, '测试邮件发送失败。'),
      type: 'error',
    };
  } finally {
    testingEmail.value = false;
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="p-5">
    <Spin :spinning="loading">
      <Card :bordered="false">
        <template #title>后台配置</template>
        <template #extra>
          <Button :disabled="loading" @click="confirmReload">重新加载</Button>
        </template>

        <p class="mb-4 text-sm text-gray-400">
          管理站点标题、模型参数、API Key、存储和 ChatGPT Web
          浏览器通道。敏感配置只显示是否已配置，不回显明文。
        </p>

        <Skeleton v-if="!loaded" active :paragraph="{ rows: 10 }" />

        <Tabs v-else v-model:active-key="activeTab">
          <!-- ========== 1. 站点显示 ========== -->
          <TabPane key="site" tab="站点显示">
            <div class="grid gap-4 xl:grid-cols-2">
              <Card size="small" title="站点显示">
                <Form layout="vertical">
                  <FormItem label="浏览器标题">
                    <Input v-model:value="form.browserTitle" />
                  </FormItem>
                  <FormItem label="网站标题">
                    <Input v-model:value="form.siteTitle" />
                  </FormItem>
                  <FormItem label="网站副标题">
                    <Input v-model:value="form.siteSubtitle" />
                  </FormItem>
                  <FormItem label="站点 Logo 地址">
                    <Input
                      v-model:value="form.siteLogoUrl"
                      placeholder="/brand-logo.svg 或 https://example.com/logo.png"
                    />
                  </FormItem>
                  <FormItem label="Favicon 地址">
                    <Input
                      v-model:value="form.siteFaviconUrl"
                      placeholder="/favicon.svg 或 https://example.com/favicon.ico"
                    />
                  </FormItem>
                  <div class="mb-4 flex items-center gap-6">
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-400">当前 Logo</span>
                      <img
                        v-if="form.siteLogoUrl"
                        :src="form.siteLogoUrl"
                        alt="当前 Logo 预览"
                        class="h-12 w-12 rounded object-contain"
                      />
                      <span v-else class="text-xs text-gray-300">未设置</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-400">浏览器图标</span>
                      <img
                        v-if="form.siteFaviconUrl"
                        :src="form.siteFaviconUrl"
                        alt="当前 Favicon 预览"
                        class="h-8 w-8 rounded object-contain"
                      />
                      <span v-else class="text-xs text-gray-300">未设置</span>
                    </div>
                  </div>
                  <FormItem label="ICP备案号">
                    <Input
                      v-model:value="form.icpNumber"
                      placeholder="例如：粤ICP备xxxxxxxx号"
                    />
                  </FormItem>
                </Form>
              </Card>

              <div class="flex flex-col gap-4">
                <Card size="small" title="页脚链接">
                  <Form layout="vertical">
                    <FormItem label="友情链接">
                      <Textarea
                        v-model:value="friendLinksText"
                        :auto-size="{ minRows: 5, maxRows: 8 }"
                        placeholder="AI 工具导航 | https://example.com&#10;素材资源站 | https://example.com/assets"
                      />
                    </FormItem>
                    <p class="text-xs text-gray-400">
                      每行一个友情链接，推荐格式：名称 |
                      链接。也支持“名称｜链接”“名称，链接”或“名称
                      https://example.com”。最多展示 8 个。
                    </p>
                  </Form>
                </Card>

                <Card size="small" title="前台模板">
                  <Alert
                    message="前台已固定为新版布局，此配置不再生效。"
                    show-icon
                    type="info"
                  />
                </Card>
              </div>

              <Card class="xl:col-span-2" size="small" title="首页弹窗">
                <Form layout="vertical">
                  <FormItem label="启用首页弹窗">
                    <Switch v-model:checked="form.homePopup.enabled" />
                  </FormItem>
                  <FormItem label="弹窗标题">
                    <Input
                      v-model:value="form.homePopup.title"
                      placeholder="例如：平台公告"
                    />
                  </FormItem>
                  <FormItem label="内容格式">
                    <Select
                      v-model:value="form.homePopup.contentFormat"
                      :options="POPUP_FORMAT_OPTIONS"
                      class="w-52"
                    />
                  </FormItem>
                  <FormItem label="弹窗内容">
                    <Textarea
                      v-model:value="form.homePopup.content"
                      :auto-size="{ minRows: 9, maxRows: 16 }"
                      :placeholder="homePopupContentPlaceholder"
                    />
                  </FormItem>
                  <p class="text-xs text-gray-400">
                    弹窗只在首页展示；用户关闭后，本次浏览器会话内不再重复弹出。HTML5
                    内容会过滤脚本、事件属性和不安全链接。
                  </p>
                </Form>
              </Card>
            </div>
          </TabPane>

          <!-- ========== 2. 生图通道 ========== -->
          <TabPane key="generation" tab="生图通道">
            <div class="flex flex-col gap-4">
              <div class="grid gap-4 xl:grid-cols-2">
                <Card size="small" title="基础生图配置">
                  <Form layout="vertical">
                    <FormItem label="默认生图 Provider">
                      <Select
                        v-model:value="form.defaultGenerationProvider"
                        :options="PROVIDER_OPTIONS"
                      />
                    </FormItem>
                    <FormItem label="OpenAI 图像模型">
                      <Input v-model:value="form.openaiImageModel" />
                    </FormItem>
                    <FormItem label="旧版 OpenAI API Key">
                      <InputPassword
                        v-model:value="openaiApiKey"
                        :placeholder="
                          form.legacyOpenaiApiKeyConfigured
                            ? '已配置，留空表示不修改'
                            : '未配置'
                        "
                        autocomplete="new-password"
                      />
                    </FormItem>
                    <p class="text-xs text-gray-400">
                      未配置兼容通道列表时，会自动使用这里的旧版单通道配置。
                    </p>
                    <FormItem label="开放参考图生图">
                      <Switch v-model:checked="form.referenceImagesEnabled" />
                    </FormItem>
                    <FormItem label="参考图保留天数">
                      <InputNumber
                        v-model:value="form.referenceImageRetentionDays"
                        :min="1"
                        :max="3650"
                        :precision="0"
                        class="w-full"
                      />
                      <p class="mt-1 text-xs text-gray-400">
                        超过该天数且未被任何生成任务引用的参考图会被自动清理（软删除并删除磁盘文件），默认 30 天。
                      </p>
                    </FormItem>
                    <FormItem label="参考图视觉分析模型">
                      <Input
                        v-model:value="form.openaiVisionModel"
                        placeholder="如 gpt-4o，留空表示关闭视觉分析"
                      />
                    </FormItem>
                    <p class="text-xs text-gray-400">
                      开放后创作页支持上传参考图。OpenAI
                      兼容通道会先用视觉分析模型提取参考图特征再生图；Stability
                      AI 走原生图生图；网页版 ChatGPT 通道不支持参考图。
                    </p>
                  </Form>
                </Card>

                <Card size="small" title="Stability AI">
                  <Form layout="vertical">
                    <FormItem label="Stability AI 模型">
                      <Input v-model:value="form.stabilityAiModel" />
                    </FormItem>
                    <FormItem label="Stability AI API Key">
                      <InputPassword
                        v-model:value="stabilityAiApiKey"
                        :placeholder="
                          form.stabilityAiApiKeyConfigured
                            ? '已配置，留空表示不修改'
                            : '未配置'
                        "
                        autocomplete="new-password"
                      />
                    </FormItem>
                  </Form>
                </Card>
              </div>

              <Card size="small" title="OpenAI 兼容中转通道">
                <template #extra>
                  <Button @click="addChannel">新增通道</Button>
                </template>

                <p v-if="channels.length === 0" class="text-sm text-gray-400">
                  尚未配置兼容通道，生图时会自动使用旧版单通道配置。点击右上角「新增通道」添加。
                </p>

                <div v-else class="grid gap-4 xl:grid-cols-2">
                  <Card
                    v-for="(channel, index) in channels"
                    :key="channel.id"
                    :title="`${index + 1}. ${channel.name}`"
                    size="small"
                  >
                    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <Space>
                        <Switch v-model:checked="channel.enabled" />
                        <span class="text-xs text-gray-400">
                          {{ channel.enabled ? '已启用' : '已停用' }}
                        </span>
                      </Space>
                      <Space>
                        <Button
                          :disabled="!channel.enabled || !channel.apiKeyConfigured"
                          :loading="checkingChannelId === channel.id"
                          size="small"
                          @click="checkChannel(channel)"
                        >
                          检测
                        </Button>
                        <Button
                          :disabled="index === 0"
                          size="small"
                          @click="moveChannel(channel.id, -1)"
                        >
                          上移
                        </Button>
                        <Button
                          :disabled="index === channels.length - 1"
                          size="small"
                          @click="moveChannel(channel.id, 1)"
                        >
                          下移
                        </Button>
                        <Button danger size="small" @click="removeChannel(channel)">
                          删除
                        </Button>
                      </Space>
                    </div>

                    <Form layout="vertical">
                      <FormItem label="名称">
                        <Input v-model:value="channel.name" />
                      </FormItem>
                      <FormItem label="模型">
                        <Input v-model:value="channel.model" />
                      </FormItem>
                      <FormItem label="Base URL">
                        <Input
                          v-model:value="channel.baseUrl"
                          placeholder="https://example.com/v1"
                        />
                      </FormItem>
                      <FormItem label="API Key">
                        <InputPassword
                          v-model:value="channel.apiKey"
                          :placeholder="
                            channel.apiKeyConfigured
                              ? '已配置，留空表示不修改'
                              : '未配置'
                          "
                          autocomplete="new-password"
                        />
                      </FormItem>
                      <FormItem label="超时秒数">
                        <InputNumber
                          v-model:value="channel.timeoutSeconds"
                          :max="900"
                          :min="30"
                          :precision="0"
                          class="w-full"
                        />
                      </FormItem>
                    </Form>
                  </Card>
                </div>

                <Alert
                  v-if="channelCheckResult"
                  :message="channelCheckResult.text"
                  :type="channelCheckResult.type"
                  class="mt-4"
                  show-icon
                />
                <p class="mt-3 text-xs text-gray-400">
                  「检测」访问该通道的 /models
                  接口，使用已保存并启用、且已配置 API
                  Key 的通道配置；新增或修改后请先保存再检测。通道的增删与排序同样在保存后生效。
                </p>
              </Card>
            </div>
          </TabPane>

          <!-- ========== 3. 安全与存储 ========== -->
          <TabPane key="safety" tab="安全与存储">
            <div class="grid gap-4 xl:grid-cols-2">
              <Card size="small" title="内容安全">
                <Form layout="vertical">
                  <FormItem label="启用违禁词拦截">
                    <Switch v-model:checked="form.moderationEnabled" />
                  </FormItem>
                  <FormItem label="违禁词词库">
                    <Textarea
                      v-model:value="form.moderationForbiddenWords"
                      :auto-size="{ minRows: 8, maxRows: 14 }"
                      placeholder="每行一个违禁词"
                    />
                  </FormItem>
                  <FormItem label="拦截提示文案">
                    <Input v-model:value="form.moderationBlockMessage" />
                  </FormItem>
                </Form>
              </Card>

              <Card size="small" title="图片存储">
                <Form layout="vertical">
                  <FormItem label="存储类型">
                    <Select
                      v-model:value="form.storageProvider"
                      :options="STORAGE_OPTIONS"
                    />
                  </FormItem>
                  <FormItem label="本地根目录">
                    <Input
                      v-model:value="form.storageLocalBaseDir"
                      placeholder="public/storage"
                    />
                  </FormItem>
                  <FormItem label="公开访问域名">
                    <Input
                      v-model:value="form.storagePublicBaseUrl"
                      placeholder="对象存储建议填 CDN / 自定义域名，留空按 endpoint 兜底"
                    />
                  </FormItem>
                  <FormItem label="生成图前缀">
                    <Input v-model:value="form.storageGeneratedPrefix" />
                  </FormItem>
                  <FormItem label="上传图前缀">
                    <Input v-model:value="form.storageUploadsPrefix" />
                  </FormItem>
                  <FormItem label="Endpoint">
                    <Input
                      v-model:value="form.storageEndpoint"
                      placeholder="对象存储 S3 兼容 endpoint，如 https://oss-cn-hangzhou.aliyuncs.com"
                    />
                  </FormItem>
                  <FormItem label="Bucket">
                    <Input v-model:value="form.storageBucket" placeholder="对象存储 Bucket 名称" />
                  </FormItem>
                  <FormItem label="Region">
                    <Input v-model:value="form.storageRegion" placeholder="如 cn-hangzhou / us-east-1" />
                  </FormItem>
                  <FormItem label="Access Key ID">
                    <InputPassword
                      v-model:value="storageAccessKeyId"
                      :placeholder="
                        form.storageAccessKeyIdConfigured
                          ? '已配置，留空表示不修改'
                          : '未配置'
                      "
                      autocomplete="new-password"
                    />
                  </FormItem>
                  <FormItem label="Secret Access Key">
                    <InputPassword
                      v-model:value="storageSecretAccessKey"
                      :placeholder="
                        form.storageSecretAccessKeyConfigured
                          ? '已配置，留空表示不修改'
                          : '未配置'
                      "
                      autocomplete="new-password"
                    />
                  </FormItem>
                  <FormItem label="路径风格寻址（force path style）">
                    <Switch v-model:checked="form.storageForcePathStyle" />
                  </FormItem>
                  <p class="text-xs text-gray-400">
                    Local 为本地磁盘存储；OSS / COS / S3 走 S3 兼容协议（一套配置覆盖三家）。
                    切换到对象存储需填写 Endpoint / Bucket / Region 及 AccessKey；自定义
                    endpoint（OSS/COS/MinIO）通常需开启路径风格寻址。支付凭证等私有文件仍走鉴权回源，不公开直链。
                  </p>
                </Form>
              </Card>
            </div>
          </TabPane>

          <!-- ========== 4. 润色与浏览器 ========== -->
          <TabPane key="polish" tab="润色与浏览器">
            <div class="grid gap-4 xl:grid-cols-2">
              <Card size="small" title="DeepSeek 润色接口">
                <Form layout="vertical">
                  <FormItem label="Base URL">
                    <Input v-model:value="form.deepseekBaseUrl" />
                  </FormItem>
                  <FormItem label="模型">
                    <Input v-model:value="form.deepseekModel" />
                  </FormItem>
                  <FormItem label="DeepSeek API Key">
                    <InputPassword
                      v-model:value="deepseekApiKey"
                      :placeholder="
                        form.deepseekApiKeyConfigured
                          ? '已配置，留空表示不修改'
                          : '未配置'
                      "
                      autocomplete="new-password"
                    />
                  </FormItem>
                  <FormItem label="润色系统提示词">
                    <Textarea
                      v-model:value="form.deepseekPolishPrompt"
                      :auto-size="{ minRows: 9, maxRows: 16 }"
                    />
                  </FormItem>
                </Form>
              </Card>

              <Card size="small" title="网页版 ChatGPT">
                <Form layout="vertical">
                  <FormItem label="启用 ChatGPT Web">
                    <Switch v-model:checked="form.chatgptWebEnabled" />
                  </FormItem>
                  <FormItem label="浏览器 Profile 路径">
                    <Input v-model:value="form.chatgptWebUserDataDir" />
                  </FormItem>
                  <FormItem label="无头模式">
                    <Switch v-model:checked="form.chatgptWebHeadless" />
                  </FormItem>
                  <FormItem label="超时时间（秒）">
                    <InputNumber
                      v-model:value="form.chatgptWebTimeoutSeconds"
                      :max="900"
                      :min="30"
                      :precision="0"
                      class="w-full"
                    />
                  </FormItem>
                  <Space>
                    <Button
                      :loading="openingChatgpt"
                      @click="openChatGPTLoginBrowser"
                    >
                      打开登录浏览器
                    </Button>
                    <Button
                      :loading="checkingChatgpt"
                      type="primary"
                      @click="checkChatGPTStatus"
                    >
                      检测登录状态
                    </Button>
                  </Space>
                </Form>
                <Alert
                  v-if="chatgptResult"
                  :message="chatgptResult.text"
                  :type="chatgptResult.type"
                  class="mt-4"
                  show-icon
                />
              </Card>
            </div>
          </TabPane>

          <!-- ========== 5. 邮件发信 ========== -->
          <TabPane key="email" tab="邮件发信">
            <div class="grid gap-4 xl:grid-cols-2">
              <Card size="small" title="SMTP 发信配置">
                <Form layout="vertical">
                  <FormItem label="启用 SMTP 发信">
                    <Switch v-model:checked="form.emailSmtpEnabled" />
                  </FormItem>
                  <FormItem label="SMTP Host">
                    <Input
                      v-model:value="form.emailSmtpHost"
                      placeholder="smtp.example.com"
                    />
                  </FormItem>
                  <FormItem label="SMTP 端口">
                    <InputNumber
                      v-model:value="form.emailSmtpPort"
                      :max="65535"
                      :min="1"
                      :precision="0"
                      class="w-full"
                    />
                  </FormItem>
                  <FormItem label="SSL/TLS">
                    <Switch v-model:checked="form.emailSmtpSecure" />
                  </FormItem>
                  <FormItem label="SMTP 用户名">
                    <Input
                      v-model:value="form.emailSmtpUser"
                      placeholder="通常为邮箱账号"
                    />
                  </FormItem>
                  <FormItem label="SMTP 密码/授权码">
                    <InputPassword
                      v-model:value="emailSmtpPassword"
                      :placeholder="
                        form.emailSmtpPasswordConfigured
                          ? '已配置，留空表示不修改'
                          : '未配置'
                      "
                      autocomplete="new-password"
                    />
                  </FormItem>
                  <FormItem label="发件邮箱">
                    <Input
                      v-model:value="form.emailFromEmail"
                      placeholder="noreply@example.com"
                    />
                  </FormItem>
                  <FormItem label="发件人名称">
                    <Input v-model:value="form.emailFromName" />
                  </FormItem>
                  <FormItem label="回复邮箱">
                    <Input v-model:value="form.emailReplyTo" placeholder="可留空" />
                  </FormItem>
                </Form>
              </Card>

              <Card size="small" title="发信测试">
                <Form layout="vertical">
                  <FormItem label="测试收件邮箱">
                    <Input
                      v-model:value="form.emailTestRecipient"
                      placeholder="留空则发送到发件邮箱"
                    />
                  </FormItem>
                  <Button
                    :loading="testingEmail"
                    type="primary"
                    @click="sendTestEmail"
                  >
                    发送测试邮件
                  </Button>
                </Form>
                <Alert
                  v-if="emailTestResult"
                  :message="emailTestResult.text"
                  :type="emailTestResult.type"
                  class="mt-4"
                  show-icon
                />
                <p class="mt-3 text-xs text-gray-400">
                  请先保存 SMTP
                  配置，再发送测试邮件。多数邮箱服务需要使用客户端授权码，而不是登录密码。
                </p>
              </Card>
            </div>
          </TabPane>

          <!-- ========== 6. 配置检测 ========== -->
          <TabPane key="diagnostics" tab="配置检测">
            <div class="flex flex-col gap-3">
              <Alert
                v-if="loaded"
                :message="
                  form.encryptionReady
                    ? '设置加密已就绪，API Key 等敏感配置将加密存储。'
                    : '未配置设置加密密钥（SETTINGS_ENCRYPTION_KEY），敏感配置无法安全存储，请尽快在服务端配置。'
                "
                :type="form.encryptionReady ? 'success' : 'warning'"
                show-icon
              />

              <Alert
                v-for="item in form.diagnostics"
                :key="item.key"
                :type="DIAGNOSTIC_ALERT_TYPES[item.status]"
                show-icon
              >
                <template #message>
                  <Space>
                    <Tag :color="DIAGNOSTIC_TAG_COLORS[item.status]">
                      {{ item.status }}
                    </Tag>
                    <strong>{{ item.label }}</strong>
                  </Space>
                </template>
                <template #description>{{ item.message }}</template>
              </Alert>

              <p
                v-if="loaded && form.diagnostics.length === 0"
                class="text-sm text-gray-400"
              >
                暂无检测项。
              </p>
            </div>
          </TabPane>
        </Tabs>
      </Card>

      <!-- 底部固定保存栏 -->
      <div class="sticky bottom-0 z-10 mt-4">
        <Card :body-style="{ padding: '12px 16px' }" class="shadow-md">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs text-gray-400">
              敏感密钥留空表示不修改；保存后将以服务端规范化结果刷新表单。
            </span>
            <Button
              :disabled="!loaded"
              :loading="saving"
              size="large"
              type="primary"
              @click="handleSave"
            >
              保存全部设置
            </Button>
          </div>
        </Card>
      </div>
    </Spin>
  </div>
</template>
