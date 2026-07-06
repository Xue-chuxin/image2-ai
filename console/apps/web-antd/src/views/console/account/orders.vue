<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { RechargeOrderView } from '#/api/console/billing';

import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  Button,
  Card,
  Empty,
  message,
  Modal,
  QRCode,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  cancelRechargeOrderApi,
  getBillingOverviewApi,
  getRechargeOrderApi,
} from '#/api/console/billing';

defineOptions({ name: 'AccountOrders' });

const router = useRouter();

const loading = ref(false);
const orders = ref<RechargeOrderView[]>([]);
/** 行级操作 loading（查单 / 取消） */
const rowLoading = reactive<Record<string, boolean>>({});

/** 扫码支付弹窗 */
const qrVisible = ref(false);
const qrOrder = ref<null | RechargeOrderView>(null);

const PROVIDER_LABELS: Record<string, string> = {
  alipay_f2f: '支付宝当面付',
  epay: '易支付',
  manual: '人工',
  paypal: 'PayPal',
  wechat_pay: '微信支付',
};

const STATUS_META: Record<
  RechargeOrderView['status'],
  { color: string; text: string }
> = {
  CANCELED: { color: 'default', text: '已取消' },
  EXPIRED: { color: 'error', text: '已过期' },
  PAID: { color: 'success', text: '已到账' },
  PENDING: { color: 'warning', text: '待支付' },
};

function formatAmount(cents: number) {
  const yuan = cents / 100;
  return `¥${cents % 100 === 0 ? yuan : yuan.toFixed(2)}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

function providerLabel(provider: string) {
  return PROVIDER_LABELS[provider] ?? provider;
}

const columns: TableColumnsType = [
  { key: 'orderNo', title: '订单号', width: 220 },
  { dataIndex: 'packageNameSnapshot', key: 'package', title: '套餐' },
  { key: 'amount', title: '金额', width: 110 },
  { key: 'credits', title: '积分', width: 140 },
  { key: 'provider', title: '支付方式', width: 130 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'createdAt', title: '创建时间', width: 180 },
  { key: 'action', title: '操作', width: 220 },
];

async function loadOrders(mode: 'auto' | 'manual' = 'auto') {
  loading.value = true;
  try {
    const overview = await getBillingOverviewApi({ mode });
    orders.value = overview.orders;
  } catch {
    // requestClient 已提示错误，这里只收敛 loading 态
  } finally {
    loading.value = false;
  }
}

/** 用最新订单数据替换列表中的对应行 */
function updateRow(updated: RechargeOrderView) {
  const index = orders.value.findIndex((item) => item.id === updated.id);
  if (index === -1) {
    orders.value.unshift(updated);
  } else {
    orders.value.splice(index, 1, updated);
  }
}

/** 继续支付：优先跳支付链接，仅有二维码时弹窗展示 */
function handlePay(order: RechargeOrderView) {
  if (order.paymentUrl) {
    window.open(order.paymentUrl, '_blank');
    return;
  }
  if (order.qrCodeUrl) {
    qrOrder.value = order;
    qrVisible.value = true;
    return;
  }
  message.warning('该订单暂无可用支付链接，请尝试查单或重新下单');
}

/** 查单：向支付网关强制查询该订单最新状态 */
async function handleQuery(order: RechargeOrderView) {
  rowLoading[order.id] = true;
  try {
    const updated = await getRechargeOrderApi(order.id, 'manual');
    updateRow(updated);
    if (updated.status === 'PAID') {
      message.success('订单已支付，积分已到账');
      if (qrOrder.value?.id === updated.id) {
        qrVisible.value = false;
      }
    } else {
      message.info(`订单当前状态：${STATUS_META[updated.status].text}`);
    }
  } catch {
    // 错误已由 requestClient 提示
  } finally {
    rowLoading[order.id] = false;
  }
}

function handleCancel(order: RechargeOrderView) {
  Modal.confirm({
    cancelText: '再想想',
    content: `取消后订单 ${order.orderNo} 将无法继续支付，确定取消吗？`,
    okText: '确认取消',
    okType: 'danger',
    title: '取消订单',
    onOk: async () => {
      rowLoading[order.id] = true;
      try {
        const updated = await cancelRechargeOrderApi(order.id);
        updateRow(updated);
        message.success('订单已取消');
      } finally {
        rowLoading[order.id] = false;
      }
    },
  });
}

function goRecharge() {
  router.push({ name: 'AccountRecharge' });
}

onMounted(() => {
  loadOrders('auto');
});
</script>

<template>
  <div class="p-5">
    <Card :bordered="false">
      <template #title>充值订单</template>
      <template #extra>
        <Button :loading="loading" type="primary" @click="loadOrders('manual')">
          刷新
        </Button>
      </template>

      <Table
        :columns="columns"
        :data-source="orders"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :scroll="{ x: 1100 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'orderNo'">
            <code class="text-xs text-gray-500">{{ record.orderNo }}</code>
          </template>

          <template v-else-if="column.key === 'amount'">
            {{ formatAmount(record.amountCents) }}
          </template>

          <template v-else-if="column.key === 'credits'">
            <span>{{ record.totalCredits }}</span>
            <span
              v-if="record.bonusCredits > 0"
              class="ml-1 text-xs text-gray-400"
            >
              (含赠送 {{ record.bonusCredits }})
            </span>
          </template>

          <template v-else-if="column.key === 'provider'">
            {{ providerLabel(record.provider) }}
          </template>

          <template v-else-if="column.key === 'status'">
            <Tag :color="STATUS_META[record.status as RechargeOrderView['status']].color">
              {{ STATUS_META[record.status as RechargeOrderView['status']].text }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            {{ formatTime(record.createdAt) }}
          </template>

          <template v-else-if="column.key === 'action'">
            <Space v-if="record.status === 'PENDING'">
              <Button
                size="small"
                type="link"
                @click="handlePay(record as RechargeOrderView)"
              >
                继续支付
              </Button>
              <Button
                :loading="rowLoading[record.id]"
                size="small"
                type="link"
                @click="handleQuery(record as RechargeOrderView)"
              >
                查单
              </Button>
              <Button
                danger
                :loading="rowLoading[record.id]"
                size="small"
                type="link"
                @click="handleCancel(record as RechargeOrderView)"
              >
                取消
              </Button>
            </Space>
            <span v-else class="text-gray-400">—</span>
          </template>
        </template>

        <template #emptyText>
          <Empty description="暂无充值订单">
            <Button type="primary" @click="goRecharge">去充值</Button>
          </Empty>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="qrVisible"
      :footer="null"
      title="扫码支付"
      width="360px"
    >
      <div v-if="qrOrder" class="flex flex-col items-center gap-3 py-4">
        <QRCode :size="220" :value="qrOrder.qrCodeUrl ?? ''" />
        <p class="text-sm text-gray-500">
          请使用「{{ providerLabel(qrOrder.provider) }}」扫码完成支付
        </p>
        <p class="text-base font-semibold">
          {{ formatAmount(qrOrder.amountCents) }}
        </p>
        <Button
          :loading="rowLoading[qrOrder.id]"
          type="primary"
          @click="handleQuery(qrOrder)"
        >
          我已支付，查单确认
        </Button>
      </div>
    </Modal>
  </div>
</template>
