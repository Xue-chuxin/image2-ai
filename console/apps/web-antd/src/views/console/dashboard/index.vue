<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Progress,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'ant-design-vue';

import { adminRequestClient } from '#/api/admin-request';

defineOptions({ name: 'ConsoleDashboard' });

/** 最近任务行（对齐 getAdminDashboardReport 的 recentJobs 序列化字段） */
interface AdminDashboardRecentJob {
  createdAt: string;
  creditCost: number;
  id: string;
  model: null | string;
  prompt: string;
  provider: string;
  status: string;
  userLabel: string;
}

/** 运营总览报告（对齐 getAdminDashboardReport 返回结构） */
interface AdminDashboardReport {
  billing: {
    paidAmountCents: number;
    paidOrders: number;
    pendingOrders: number;
  };
  credits: {
    available: number;
    frozen: number;
  };
  generatedAt: string;
  images: {
    curated: number;
    generated: number;
    public: number;
    uploads: number;
  };
  jobs: {
    canceled: number;
    completed: number;
    failed: number;
    running: number;
    today: number;
    total: number;
  };
  recentJobs: AdminDashboardRecentJob[];
  users: {
    admins: number;
    regular: number;
    total: number;
  };
}

const loading = ref(false);
const report = ref<AdminDashboardReport | null>(null);

const JOB_STATUS_META: Record<string, { color: string; text: string }> = {
  CANCELED: { color: 'default', text: '已取消' },
  COMPLETED: { color: 'success', text: '已完成' },
  FAILED: { color: 'error', text: '失败' },
  GENERATING: { color: 'processing', text: '生成中' },
  POLISHING: { color: 'processing', text: '润色中' },
  QUEUED: { color: 'processing', text: '排队中' },
  UPLOADING: { color: 'processing', text: '保存中' },
};

function statusMeta(status: string) {
  return JOB_STATUS_META[status] ?? { color: 'default', text: status };
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

/** 任务完成率：完成 / (完成 + 失败 + 取消 + 进行中) */
const completionRate = computed(() => {
  if (!report.value) return 0;
  const { canceled, completed, failed, running } = report.value.jobs;
  const total = completed + failed + canceled + running;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
});

const recentColumns: TableColumnsType = [
  { key: 'status', title: '状态', width: 100 },
  { key: 'prompt', title: '任务', width: 360 },
  { key: 'provider', title: 'Provider', width: 190 },
  { key: 'userLabel', title: '用户', width: 220 },
  { key: 'createdAt', title: '时间', width: 180 },
];

async function loadReport() {
  loading.value = true;
  try {
    const data = await adminRequestClient.get<{
      ok: boolean;
      report: AdminDashboardReport;
    }>('/admin/dashboard');
    report.value = data.report;
  } catch {
    // adminRequestClient 已统一 message.error，这里只收敛 loading 态
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadReport();
});
</script>

<template>
  <div class="p-5">
    <Alert
      class="mb-4"
      message="管理后台正在迁移到控制台，旧版后台 /admin 将在迁移完成后下线。"
      show-icon
      type="info"
    />

    <Card :bordered="false">
      <template #title>运营总览</template>
      <template #extra>
        <Button :loading="loading" type="primary" @click="loadReport">
          刷新
        </Button>
      </template>
      <p class="text-sm text-gray-500">
        集中查看用户、任务、作品、积分和充值的核心数据。这里不做复杂操作，负责让你第一眼知道系统是否在正常跑。
      </p>
      <div v-if="report" class="mt-2 flex flex-wrap gap-2">
        <Tag color="processing">任务 {{ report.jobs.total }}</Tag>
        <Tag color="success">作品 {{ report.images.generated }}</Tag>
        <Tag color="warning">冻结积分 {{ report.credits.frozen }}</Tag>
      </div>
    </Card>

    <Spin :spinning="loading && !report">
      <template v-if="report">
        <!-- KPI 卡片 -->
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card :bordered="false">
            <Statistic :value="report.users.total" title="用户总数" />
            <div class="mt-3 flex flex-wrap gap-2">
              <Tag>普通用户 {{ report.users.regular }}</Tag>
              <Tag color="processing">管理员 {{ report.users.admins }}</Tag>
            </div>
          </Card>
          <Card :bordered="false">
            <Statistic :value="report.jobs.total" title="任务总数" />
            <div class="mt-3 flex flex-wrap gap-2">
              <Tag color="processing">今日 {{ report.jobs.today }}</Tag>
              <Tag color="warning">进行中 {{ report.jobs.running }}</Tag>
            </div>
          </Card>
          <Card :bordered="false">
            <Statistic :value="report.jobs.today" title="今日任务" />
            <div class="mt-3 flex flex-wrap gap-2">
              <Tag color="success">完成 {{ report.jobs.completed }}</Tag>
              <Tag color="error">失败 {{ report.jobs.failed }}</Tag>
            </div>
          </Card>
          <Card :bordered="false">
            <Statistic :value="report.images.generated" title="生成作品" />
            <div class="mt-3 flex flex-wrap gap-2">
              <Tag color="success">公开 {{ report.images.public }}</Tag>
              <Tag color="processing">精选 {{ report.images.curated }}</Tag>
            </div>
          </Card>
          <Card :bordered="false">
            <Statistic :value="report.images.public" title="公开作品" />
            <div class="mt-3 flex flex-wrap gap-2">
              <Tag color="processing">精选 {{ report.images.curated }}</Tag>
              <Tag>参考图 {{ report.images.uploads }}</Tag>
            </div>
          </Card>
          <Card :bordered="false">
            <Statistic
              :value="report.credits.available + report.credits.frozen"
              title="积分总量"
            />
            <div class="mt-3 flex flex-wrap gap-2">
              <Tag color="success">可用 {{ report.credits.available }}</Tag>
              <Tag color="warning">冻结 {{ report.credits.frozen }}</Tag>
            </div>
          </Card>
          <Card :bordered="false">
            <Statistic :value="report.billing.paidOrders" title="已付订单数" />
            <div class="mt-3 flex flex-wrap gap-2">
              <Tag color="warning">待付 {{ report.billing.pendingOrders }}</Tag>
            </div>
          </Card>
          <Card :bordered="false">
            <Statistic
              :precision="2"
              :value="report.billing.paidAmountCents / 100"
              prefix="¥"
              suffix="元"
              title="到账金额"
            />
            <div class="mt-3 flex flex-wrap gap-2">
              <Tag color="success">已付 {{ report.billing.paidOrders }}</Tag>
              <Tag color="warning">待付 {{ report.billing.pendingOrders }}</Tag>
            </div>
          </Card>
        </div>

        <!-- 任务健康度 / 积分与素材 -->
        <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card :bordered="false" title="任务健康度">
            <Progress
              :format="(percent?: number) => `${percent ?? 0}% 完成`"
              :percent="completionRate"
            />
            <div class="mt-4 flex flex-wrap gap-2">
              <Tag color="success">完成 {{ report.jobs.completed }}</Tag>
              <Tag color="error">失败 {{ report.jobs.failed }}</Tag>
              <Tag color="processing">进行中 {{ report.jobs.running }}</Tag>
              <Tag>取消 {{ report.jobs.canceled }}</Tag>
            </div>
          </Card>
          <Card :bordered="false" title="积分与素材">
            <div class="grid grid-cols-3 gap-4">
              <Statistic :value="report.credits.available" title="可用积分" />
              <Statistic :value="report.credits.frozen" title="冻结积分" />
              <Statistic :value="report.images.uploads" title="参考图" />
            </div>
          </Card>
        </div>

        <!-- 最近任务 -->
        <Card :bordered="false" class="mt-4" title="最近任务">
          <Table
            :columns="recentColumns"
            :data-source="report.recentJobs"
            :loading="loading"
            :pagination="false"
            :scroll="{ x: 1050 }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <Tag :color="statusMeta(record.status).color">
                  {{ statusMeta(record.status).text }}
                </Tag>
              </template>

              <template v-else-if="column.key === 'prompt'">
                <p class="line-clamp-2 mb-1 text-sm" :title="record.prompt">
                  {{ record.prompt || '—' }}
                </p>
                <code class="text-xs text-gray-400" :title="record.id">
                  {{ record.id.slice(0, 12) }}…
                </code>
              </template>

              <template v-else-if="column.key === 'provider'">
                <Tag>{{ record.provider }}</Tag>
                <p class="mt-1 text-xs text-gray-400">
                  {{ record.model || '未记录模型' }}
                </p>
              </template>

              <template v-else-if="column.key === 'userLabel'">
                <span class="text-xs text-gray-500">
                  {{ record.userLabel }}
                </span>
              </template>

              <template v-else-if="column.key === 'createdAt'">
                {{ formatTime(record.createdAt) }}
              </template>
            </template>

            <template #emptyText>暂无任务记录</template>
          </Table>
        </Card>
      </template>

      <Card v-else-if="!loading" :bordered="false" class="mt-4">
        <p class="text-sm text-gray-500">
          暂未读取到运营数据，请点击右上角「刷新」重试。
        </p>
      </Card>
    </Spin>
  </div>
</template>
