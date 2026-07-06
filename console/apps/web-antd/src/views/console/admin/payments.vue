<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  InputSearch,
  message,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { adminRequestClient } from '#/api/admin-request';

defineOptions({ name: 'AdminPayments' });

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

/** 支付事件视图（对齐旧版 AdminPaymentEventView 序列化视图） */
interface AdminPaymentEventView {
  id: string;
  provider: string;
  eventType: string;
  status: string;
  orderNo: null | string;
  providerTradeNo: null | string;
  message: null | string;
  createdAt: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  alipay_f2f: '支付宝当面付',
  epay: '易支付',
  paypal: 'PayPal',
  wechat_pay: '微信支付',
};

const EVENT_STATUS_COLORS: Record<string, string> = {
  FAILED: 'error',
  IGNORED: 'default',
  RECEIVED: 'processing',
  VERIFIED: 'success',
};

const diagnostics = ref<PaymentDiagnosticItem[]>([]);
const diagnosticsLoading = ref(false);

const events = ref<AdminPaymentEventView[]>([]);
const eventsLoading = ref(false);

/** 事件筛选条件 */
const filterProvider = ref<string>('');
const filterStatus = ref<string>('');
const searchKeyword = ref('');

const providerOptions = [
  { label: '全部渠道', value: '' },
  { label: '易支付', value: 'epay' },
  { label: '支付宝当面付', value: 'alipay_f2f' },
  { label: '微信支付', value: 'wechat_pay' },
  { label: 'PayPal', value: 'paypal' },
];

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: 'VERIFIED（验签成功）', value: 'VERIFIED' },
  { label: 'FAILED（处理失败）', value: 'FAILED' },
  { label: 'RECEIVED（已接收）', value: 'RECEIVED' },
  { label: 'IGNORED（已忽略）', value: 'IGNORED' },
];

/** 诊断提示总数：用于顶部整体状态 Alert */
const issueCount = computed(() =>
  diagnostics.value.reduce((total, item) => total + item.issues.length, 0),
);

function providerLabel(provider: string) {
  return PROVIDER_LABELS[provider] ?? provider;
}

function eventStatusColor(status: string) {
  return EVENT_STATUS_COLORS[status] ?? 'default';
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  } catch {
    message.error('复制失败，请手动复制');
  }
}

async function loadDiagnostics() {
  diagnosticsLoading.value = true;
  try {
    const data = await adminRequestClient.get<{
      diagnostics: PaymentDiagnosticItem[];
      ok: boolean;
    }>('/admin/payments/diagnostics');
    diagnostics.value = data.diagnostics;
  } catch {
    // adminRequestClient 已统一 message.error，这里只收敛 loading 态
  } finally {
    diagnosticsLoading.value = false;
  }
}

async function loadEvents() {
  eventsLoading.value = true;
  try {
    const data = await adminRequestClient.get<{
      events: AdminPaymentEventView[];
      ok: boolean;
    }>('/admin/payments/events', {
      params: {
        limit: 80,
        provider: filterProvider.value || undefined,
        q: searchKeyword.value.trim() || undefined,
        status: filterStatus.value || undefined,
      },
    });
    events.value = data.events;
  } catch {
    // 错误已由 adminRequestClient 提示
  } finally {
    eventsLoading.value = false;
  }
}

function refreshAll() {
  loadDiagnostics();
  loadEvents();
}

const eventColumns: TableColumnsType = [
  { key: 'createdAt', title: '时间', width: 180 },
  { key: 'provider', title: '渠道', width: 140 },
  { dataIndex: 'eventType', key: 'eventType', title: '事件类型', width: 160 },
  { key: 'orderNo', title: '订单与流水', width: 260 },
  { key: 'status', title: '状态', width: 110 },
  { key: 'message', title: '消息', width: 260 },
];

onMounted(() => {
  refreshAll();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold">支付联调面板</h2>
        <p class="text-sm text-gray-500">
          检查易支付、支付宝当面付、微信支付和 PayPal 的启用状态、密钥配置与回调地址。
        </p>
      </div>
      <Button
        :loading="diagnosticsLoading || eventsLoading"
        type="primary"
        @click="refreshAll"
      >
        刷新
      </Button>
    </div>

    <Alert
      v-if="issueCount > 0"
      class="mb-4"
      :message="'支付配置存在提示'"
      :description="`当前诊断发现 ${issueCount} 条提示，线上联调前请确认回调域名与商户密钥。`"
      show-icon
      type="warning"
    />
    <Alert
      v-else-if="diagnostics.length > 0"
      class="mb-4"
      :message="'支付诊断未发现明显问题'"
      description="支付渠道的启用状态、密钥配置和回调地址已完成基础检查。"
      show-icon
      type="success"
    />

    <div class="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card
        v-for="item in diagnostics"
        :key="item.provider"
        :loading="diagnosticsLoading"
        size="small"
      >
        <template #title>
          <div class="flex items-center gap-2">
            <span>{{ item.label }}</span>
            <code class="text-xs font-normal text-gray-400">
              {{ item.provider }}
            </code>
          </div>
        </template>
        <template #extra>
          <Space>
            <Tag :color="item.enabled ? 'success' : 'default'">
              {{ item.enabled ? '已启用' : '未启用' }}
            </Tag>
            <Tag :color="item.configured ? 'processing' : 'warning'">
              {{ item.configured ? '配置完整' : '待配置' }}
            </Tag>
          </Space>
        </template>

        <div class="space-y-2 text-sm">
          <div class="flex items-start gap-2">
            <span class="shrink-0 text-gray-500">Notify:</span>
            <code class="break-all text-xs text-gray-600">
              {{ item.notifyUrl }}
            </code>
            <Button
              class="shrink-0"
              size="small"
              type="link"
              @click="copyText(item.notifyUrl)"
            >
              复制
            </Button>
          </div>
          <div class="flex items-start gap-2">
            <span class="shrink-0 text-gray-500">Return:</span>
            <code class="break-all text-xs text-gray-600">
              {{ item.returnUrl }}
            </code>
            <Button
              class="shrink-0"
              size="small"
              type="link"
              @click="copyText(item.returnUrl)"
            >
              复制
            </Button>
          </div>

          <template v-if="item.issues.length > 0">
            <Alert
              v-for="issue in item.issues"
              :key="issue"
              :message="issue"
              show-icon
              type="warning"
            />
          </template>
          <Tag v-else color="success">暂无问题</Tag>
        </div>
      </Card>
    </div>

    <Card :bordered="false">
      <template #title>最近支付事件</template>
      <template #extra>
        <Space>
          <Select
            v-model:value="filterProvider"
            class="w-40"
            :options="providerOptions"
            @change="loadEvents"
          />
          <Select
            v-model:value="filterStatus"
            class="w-48"
            :options="statusOptions"
            @change="loadEvents"
          />
          <InputSearch
            v-model:value="searchKeyword"
            allow-clear
            class="w-56"
            placeholder="搜索订单号 / 流水号"
            @search="loadEvents"
          />
        </Space>
      </template>

      <Table
        :columns="eventColumns"
        :data-source="events"
        :loading="eventsLoading"
        :locale="{ emptyText: '暂无支付事件，完成一次支付回调后会出现在这里。' }"
        :pagination="{ pageSize: 15, showSizeChanger: false }"
        :scroll="{ x: 1100 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'createdAt'">
            {{ formatTime(record.createdAt) }}
          </template>

          <template v-else-if="column.key === 'provider'">
            <Tag>{{ providerLabel(record.provider) }}</Tag>
          </template>

          <template v-else-if="column.key === 'orderNo'">
            <div class="text-xs">
              <p>
                订单：
                <code v-if="record.orderNo" class="text-gray-600">
                  {{ record.orderNo }}
                </code>
                <span v-else class="text-gray-400">未识别</span>
              </p>
              <p class="text-gray-400">
                渠道流水：{{ record.providerTradeNo || '暂无' }}
              </p>
            </div>
          </template>

          <template v-else-if="column.key === 'status'">
            <Tag :color="eventStatusColor(record.status)">
              {{ record.status }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'message'">
            <Tooltip v-if="record.message" :title="record.message">
              <span class="block max-w-[240px] truncate text-gray-600">
                {{ record.message }}
              </span>
            </Tooltip>
            <span v-else class="text-gray-400">无</span>
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>
