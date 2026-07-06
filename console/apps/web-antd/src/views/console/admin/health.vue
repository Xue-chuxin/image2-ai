<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, onMounted, ref } from 'vue';

import { useAppConfig } from '@vben/hooks';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Space,
  Statistic,
  Table,
  Tag,
} from 'ant-design-vue';

import { adminRequestClient } from '#/api/admin-request';

defineOptions({ name: 'AdminHealth' });

type AdminHealthStatus = 'error' | 'ok' | 'warning';

/** 自检项（对齐旧版 AdminHealthItem 序列化视图） */
interface AdminHealthItem {
  id: string;
  label: string;
  status: AdminHealthStatus;
  description: string;
  detail?: string;
}

/** 支付渠道诊断项（对齐旧版 PaymentDiagnosticItem 序列化视图） */
interface PaymentDiagnosticItem {
  provider: string;
  label: string;
  enabled: boolean;
  configured: boolean;
  notifyUrl: string;
  returnUrl: string;
  issues: string[];
}

/** 自检报告（对齐旧版 AdminHealthReport 序列化视图） */
interface AdminHealthReport {
  generatedAt: string;
  summary: Record<AdminHealthStatus, number>;
  items: AdminHealthItem[];
  paymentDiagnostics: PaymentDiagnosticItem[];
}

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

const STATUS_META: Record<AdminHealthStatus, { color: string; text: string }> =
  {
    error: { color: 'error', text: '异常' },
    ok: { color: 'success', text: '正常' },
    warning: { color: 'warning', text: '提示' },
  };

const loading = ref(false);
const report = ref<AdminHealthReport | null>(null);

const errorItems = computed(
  () => report.value?.items.filter((item) => item.status === 'error') ?? [],
);
const warningItems = computed(
  () => report.value?.items.filter((item) => item.status === 'warning') ?? [],
);

const enabledPaymentCount = computed(
  () =>
    report.value?.paymentDiagnostics.filter((item) => item.enabled).length ?? 0,
);
const configuredPaymentCount = computed(
  () =>
    report.value?.paymentDiagnostics.filter((item) => item.configured)
      .length ?? 0,
);

const healthColumns: TableColumnsType = [
  { dataIndex: 'label', key: 'label', title: '检查项', width: 200 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'description', title: '说明' },
];

const paymentColumns: TableColumnsType = [
  { key: 'channel', title: '渠道', width: 170 },
  { key: 'enabled', title: '启用', width: 100 },
  { key: 'configured', title: '配置', width: 110 },
  { key: 'callback', title: '回调地址', width: 360 },
  { key: 'issues', title: '提示' },
];

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

async function loadReport() {
  loading.value = true;
  try {
    const data = await adminRequestClient.get<{
      ok: boolean;
      report: AdminHealthReport;
    }>('/admin/health');
    report.value = data.report;
  } catch {
    // 错误已由 adminRequestClient 统一提示
  } finally {
    loading.value = false;
  }
}

/** 查看原始 JSON 报告（旧版「查看 JSON」按钮） */
function openJsonReport() {
  window.open(`${apiURL}/admin/health`, '_blank', 'noopener');
}

onMounted(() => {
  loadReport();
});
</script>

<template>
  <div class="p-5">
    <Card :bordered="false">
      <template #title>上线自检</template>
      <template #extra>
        <Space>
          <Button @click="openJsonReport">查看 JSON</Button>
          <Button :loading="loading" type="primary" @click="loadReport">
            刷新
          </Button>
        </Space>
      </template>

      <p class="mb-4 text-sm text-gray-500">
        检查数据库、会话密钥、生图通道、任务状态、支付回调和本地存储风险，不展示任何密钥明文。
      </p>

      <!-- 汇总统计：正常 / 提示 / 异常 -->
      <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card size="small">
          <Statistic
            :value="report?.summary.ok ?? 0"
            :value-style="{ color: '#52c41a' }"
            suffix="项"
            title="正常项"
          />
        </Card>
        <Card size="small">
          <Statistic
            :value="report?.summary.warning ?? 0"
            :value-style="{ color: '#faad14' }"
            suffix="项"
            title="提示项"
          />
        </Card>
        <Card size="small">
          <Statistic
            :value="report?.summary.error ?? 0"
            :value-style="{ color: '#ff4d4f' }"
            suffix="项"
            title="异常项"
          />
        </Card>
      </div>

      <p v-if="report" class="mb-4 text-xs text-gray-400">
        报告生成时间：{{ formatTime(report.generatedAt) }}
      </p>

      <!-- 异常 / 提示优先的汇总 Alert -->
      <Alert
        v-if="errorItems.length > 0"
        class="mb-4"
        show-icon
        type="error"
      >
        <template #message>
          存在 {{ errorItems.length }} 个异常项，请优先处理异常配置，再进行线上投放或支付联调
        </template>
        <template #description>
          <ul class="m-0 list-disc pl-5">
            <li v-for="item in errorItems" :key="item.id">
              <span class="font-medium">{{ item.label }}</span
              >：{{ item.description }}
            </li>
          </ul>
        </template>
      </Alert>

      <Alert
        v-if="warningItems.length > 0"
        class="mb-4"
        show-icon
        type="warning"
      >
        <template #message>
          存在 {{ warningItems.length }} 个配置提示，系统可以继续运行，但建议根据提示补齐冗余、存储和回调配置
        </template>
        <template #description>
          <ul class="m-0 list-disc pl-5">
            <li v-for="item in warningItems" :key="item.id">
              <span class="font-medium">{{ item.label }}</span
              >：{{ item.description }}
            </li>
          </ul>
        </template>
      </Alert>

      <Alert
        v-if="report && errorItems.length === 0 && warningItems.length === 0"
        class="mb-4"
        description="当前核心运行项未发现异常。"
        message="自检正常"
        show-icon
        type="success"
      />

      <!-- 全部检查项 -->
      <Table
        :columns="healthColumns"
        :data-source="report?.items ?? []"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: false }"
        :scroll="{ x: 900 }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag
              :color="STATUS_META[record.status as AdminHealthStatus].color"
            >
              {{ STATUS_META[record.status as AdminHealthStatus].text }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'description'">
            <div>
              <p class="m-0">{{ record.description }}</p>
              <p v-if="record.detail" class="m-0 mt-1 text-xs text-gray-400">
                {{ record.detail }}
              </p>
            </div>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 支付回调诊断 -->
    <Card :bordered="false" class="mt-5">
      <template #title>支付回调</template>

      <Descriptions
        v-if="report"
        :column="3"
        bordered
        class="mb-4"
        size="small"
      >
        <DescriptionsItem label="生成时间">
          {{ formatTime(report.generatedAt) }}
        </DescriptionsItem>
        <DescriptionsItem label="启用渠道">
          {{ enabledPaymentCount }}
        </DescriptionsItem>
        <DescriptionsItem label="配置完整">
          {{ configuredPaymentCount }}
        </DescriptionsItem>
      </Descriptions>

      <Table
        :columns="paymentColumns"
        :data-source="report?.paymentDiagnostics ?? []"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 1100 }"
        row-key="provider"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'channel'">
            <div>
              <p class="m-0 font-medium">{{ record.label }}</p>
              <code class="text-xs text-gray-400">{{ record.provider }}</code>
            </div>
          </template>

          <template v-else-if="column.key === 'enabled'">
            <Tag :color="record.enabled ? 'success' : 'default'">
              {{ record.enabled ? '已启用' : '未启用' }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'configured'">
            <Tag :color="record.configured ? 'blue' : 'warning'">
              {{ record.configured ? '配置完整' : '待配置' }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'callback'">
            <div class="text-xs text-gray-500">
              <p class="m-0 break-all">Notify: {{ record.notifyUrl }}</p>
              <p class="m-0 break-all">Return: {{ record.returnUrl }}</p>
            </div>
          </template>

          <template v-else-if="column.key === 'issues'">
            <Space v-if="record.issues.length > 0" wrap>
              <Tag
                v-for="issue in record.issues as string[]"
                :key="issue"
                color="warning"
              >
                {{ issue }}
              </Tag>
            </Space>
            <Tag v-else color="success">暂无问题</Tag>
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>
