<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { adminRequestClient } from '#/api/admin-request';

defineOptions({ name: 'AdminJobs' });

/** 生成图片（精简视图，仅取页面用到的字段） */
interface AdminJobImage {
  id: string;
  thumbnailUrl: null | string;
  url: string;
}

interface AdminJobUser {
  displayName: null | string;
  email: null | string;
  id: string;
}

/** 对齐旧版 AdminGenerationJobView 序列化字段 */
interface AdminGenerationJobView {
  createdAt: string;
  creditCost: number;
  errorMessage: null | string;
  id: string;
  imageCount: number;
  images: AdminJobImage[];
  isStale: boolean;
  model: null | string;
  promptZh: string;
  provider: string;
  quality: string;
  queuePosition: null | number;
  queueWaitingCount: number;
  ratio: string;
  status: string;
  updatedAt: string;
  user: AdminJobUser;
}

interface JobsListResponse {
  jobs: AdminGenerationJobView[];
  ok: boolean;
}

interface JobResponse {
  job: AdminGenerationJobView;
  ok: boolean;
}

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '排队中', value: 'QUEUED' },
  { label: '润色中', value: 'POLISHING' },
  { label: '生成中', value: 'GENERATING' },
  { label: '保存中', value: 'UPLOADING' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '失败', value: 'FAILED' },
  { label: '已取消', value: 'CANCELED' },
];

const ACTIVE_STATUSES = new Set([
  'QUEUED',
  'POLISHING',
  'GENERATING',
  'UPLOADING',
]);

const loading = ref(false);
const jobs = ref<AdminGenerationJobView[]>([]);
const statusFilter = ref('');
const query = ref('');
/** 行级操作 loading（刷新 / 重试 / 标失败） */
const rowLoading = reactive<Record<string, boolean>>({});

const stats = computed(() => ({
  completed: jobs.value.filter((job) => job.status === 'COMPLETED').length,
  failed: jobs.value.filter((job) => job.status === 'FAILED').length,
  running: jobs.value.filter((job) => ACTIVE_STATUSES.has(job.status)).length,
  total: jobs.value.length,
}));

function isActive(status: string) {
  return ACTIVE_STATUSES.has(status);
}

function statusText(status: string) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

function statusColor(status: string) {
  if (status === 'COMPLETED') return 'success';
  if (status === 'FAILED') return 'error';
  if (isActive(status)) return 'processing';
  return 'default';
}

/** chatgpt_web 排队位次文案，与旧版一致 */
function queueText(job: AdminGenerationJobView) {
  if (job.provider !== 'chatgpt_web') return '';
  if (job.status === 'GENERATING') return 'ChatGPT Web 正在执行';
  if (job.status === 'QUEUED') {
    return job.queueWaitingCount > 0
      ? `队列 #${job.queuePosition}，前面 ${job.queueWaitingCount} 个`
      : '队列 #1，即将开始';
  }
  return '';
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 12)}…` : id;
}

function summarizePrompt(value: string) {
  return value.length > 92 ? `${value.slice(0, 92)}...` : value;
}

function firstThumb(job: AdminGenerationJobView) {
  const image = job.images?.[0];
  if (!image) return '';
  return image.thumbnailUrl ?? image.url;
}

const columns: TableColumnsType = [
  { key: 'status', title: '状态', width: 180 },
  { key: 'prompt', title: '任务', width: 340 },
  { key: 'user', title: '用户', width: 200 },
  { key: 'provider', title: 'Provider', width: 170 },
  { key: 'meta', title: '参数', width: 160 },
  { key: 'image', title: '图片', width: 90 },
  { key: 'createdAt', title: '时间', width: 170 },
  { fixed: 'right', key: 'action', title: '操作', width: 200 },
];

async function loadJobs() {
  loading.value = true;
  try {
    const data = await adminRequestClient.get<JobsListResponse>(
      '/admin/generation/jobs',
      {
        params: {
          limit: 50,
          q: query.value.trim() || undefined,
          status: statusFilter.value || undefined,
        },
      },
    );
    jobs.value = data.jobs;
  } catch {
    // adminRequestClient 已统一 message.error，这里只收敛 loading
  } finally {
    loading.value = false;
  }
}

/** 用最新任务数据替换列表中的对应行 */
function replaceJob(updated: AdminGenerationJobView) {
  const index = jobs.value.findIndex((job) => job.id === updated.id);
  if (index === -1) {
    jobs.value.unshift(updated);
  } else {
    jobs.value.splice(index, 1, updated);
  }
}

/** 刷新单个任务 */
async function refreshJob(job: AdminGenerationJobView) {
  rowLoading[job.id] = true;
  try {
    const data = await adminRequestClient.get<JobResponse>(
      `/admin/generation/jobs/${job.id}`,
    );
    replaceJob(data.job);
    message.success('单个任务已刷新。');
  } catch {
    // 错误已由 adminRequestClient 提示
  } finally {
    rowLoading[job.id] = false;
  }
}

/** 重试失败/卡住的任务 */
async function retryJob(job: AdminGenerationJobView) {
  rowLoading[job.id] = true;
  try {
    const data = await adminRequestClient.post<JobResponse>(
      `/admin/generation/jobs/${job.id}/retry`,
    );
    replaceJob(data.job);
    message.success('任务已重新加入队列。');
  } catch {
    // 错误已由 adminRequestClient 提示
  } finally {
    rowLoading[job.id] = false;
  }
}

/** 标记任务失败（危险操作，二次确认） */
function handleFail(job: AdminGenerationJobView) {
  Modal.confirm({
    cancelText: '再想想',
    content: `任务 ${shortId(job.id)} 将被标记为失败并终止执行，确定继续吗？`,
    okText: '确认标记失败',
    okType: 'danger',
    title: '标记任务失败',
    onOk: async () => {
      rowLoading[job.id] = true;
      try {
        const data = await adminRequestClient.post<JobResponse>(
          `/admin/generation/jobs/${job.id}/fail`,
        );
        replaceJob(data.job);
        message.success('任务已标记失败。');
      } finally {
        rowLoading[job.id] = false;
      }
    },
  });
}

function handleStatusChange() {
  loadJobs();
}

onMounted(() => {
  loadJobs();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card :bordered="false">
        <Statistic :value="stats.total" title="当前列表" />
      </Card>
      <Card :bordered="false">
        <Statistic :value="stats.running" title="进行中" />
      </Card>
      <Card :bordered="false">
        <Statistic :value="stats.completed" title="已完成" />
      </Card>
      <Card :bordered="false">
        <Statistic :value="stats.failed" title="失败" />
      </Card>
    </div>

    <Card :bordered="false" title="最近生成任务">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <Select
          v-model:value="statusFilter"
          :options="STATUS_OPTIONS"
          class="w-36"
          placeholder="状态"
          @change="handleStatusChange"
        />
        <Input
          v-model:value="query"
          allow-clear
          class="w-72"
          placeholder="任务 ID / 用户邮箱 / 昵称"
          @press-enter="loadJobs"
        />
        <Button :loading="loading" type="primary" @click="loadJobs">
          刷新任务
        </Button>
      </div>

      <Table
        :columns="columns"
        :data-source="jobs"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :scroll="{ x: 1520 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Space direction="vertical" :size="4">
              <span>
                <Tag :color="statusColor(record.status)">
                  {{ statusText(record.status) }}
                </Tag>
                <Tag v-if="record.isStale" color="warning">疑似卡住</Tag>
              </span>
              <span
                v-if="queueText(record as AdminGenerationJobView)"
                class="text-xs text-gray-400"
              >
                {{ queueText(record as AdminGenerationJobView) }}
              </span>
            </Space>
          </template>

          <template v-else-if="column.key === 'prompt'">
            <div class="flex flex-col gap-1">
              <Tooltip :title="record.promptZh">
                <span>{{ summarizePrompt(record.promptZh) }}</span>
              </Tooltip>
              <Tooltip :title="record.id">
                <code class="text-xs text-gray-400">
                  {{ shortId(record.id) }}
                </code>
              </Tooltip>
              <span v-if="record.errorMessage" class="text-xs text-red-500">
                {{ record.errorMessage }}
              </span>
            </div>
          </template>

          <template v-else-if="column.key === 'user'">
            <div class="flex flex-col gap-1">
              <span>{{ record.user?.email ?? '—' }}</span>
              <span v-if="record.user?.displayName" class="text-xs text-gray-400">
                {{ record.user.displayName }}
              </span>
            </div>
          </template>

          <template v-else-if="column.key === 'provider'">
            <Space direction="vertical" :size="4">
              <Tag>{{ record.provider }}</Tag>
              <span class="text-xs text-gray-400">
                {{ record.model || '未返回模型' }}
              </span>
            </Space>
          </template>

          <template v-else-if="column.key === 'meta'">
            <div class="flex flex-col gap-1 text-xs">
              <span>{{ record.ratio }} · {{ record.quality }}</span>
              <span>{{ record.imageCount }} 张 · {{ record.creditCost }} 积分</span>
            </div>
          </template>

          <template v-else-if="column.key === 'image'">
            <img
              v-if="firstThumb(record as AdminGenerationJobView)"
              :alt="record.promptZh"
              :src="firstThumb(record as AdminGenerationJobView)"
              class="h-12 w-12 rounded object-cover"
            />
            <span v-else class="text-xs text-gray-400">暂无</span>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            <span class="text-xs text-gray-500">
              {{ formatTime(record.createdAt) }}
            </span>
          </template>

          <template v-else-if="column.key === 'action'">
            <Space wrap>
              <Button
                :loading="rowLoading[record.id]"
                size="small"
                @click="refreshJob(record as AdminGenerationJobView)"
              >
                刷新
              </Button>
              <Button
                v-if="record.status === 'FAILED' || record.isStale"
                :loading="rowLoading[record.id]"
                size="small"
                type="primary"
                @click="retryJob(record as AdminGenerationJobView)"
              >
                重试
              </Button>
              <Button
                v-if="isActive(record.status) || record.isStale"
                danger
                :loading="rowLoading[record.id]"
                size="small"
                @click="handleFail(record as AdminGenerationJobView)"
              >
                标失败
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>
