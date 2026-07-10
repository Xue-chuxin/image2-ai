<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type {
  BillingOverview,
  CreditTransactionView,
} from '#/api/console/billing';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Button, Card, Statistic, Table, Tag } from 'ant-design-vue';

import {
  getBillingOverviewApi,
  listCreditTransactionsApi,
} from '#/api/console/billing';

defineOptions({ name: 'AccountOverview' });

const router = useRouter();

const overviewLoading = ref(false);
const overview = ref<BillingOverview | null>(null);

const transactionsLoading = ref(false);
const transactions = ref<CreditTransactionView[]>([]);

const availableCredits = computed(
  () => overview.value?.balance.available ?? 0,
);
const frozenCredits = computed(() => overview.value?.balance.frozen ?? 0);
const pendingOrderCount = computed(
  () =>
    overview.value?.orders.filter((order) => order.status === 'PENDING')
      .length ?? 0,
);

const transactionTypeMeta: Record<
  CreditTransactionView['type'],
  { color: string; label: string }
> = {
  ADJUSTMENT: { color: 'purple', label: '人工调整' },
  FREEZE: { color: 'warning', label: '任务冻结' },
  GRANT: { color: 'success', label: '注册赠送' },
  PURCHASE: { color: 'blue', label: '充值到账' },
  REFUND: { color: 'cyan', label: '失败退回' },
  SPEND: { color: 'error', label: '生成扣除' },
};

const transactionColumns: TableColumnsType = [
  { dataIndex: 'createdAt', key: 'createdAt', title: '时间', width: 180 },
  { dataIndex: 'type', key: 'type', title: '类型', width: 110 },
  { dataIndex: 'amount', key: 'amount', title: '变动', width: 100 },
  { dataIndex: 'balance', key: 'balance', title: '余额', width: 100 },
  { dataIndex: 'memo', key: 'memo', title: '备注' },
];

function getTransactionMeta(type: CreditTransactionView['type']) {
  return transactionTypeMeta[type] ?? { color: 'default', label: type };
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

function formatAmount(amount: number) {
  return amount > 0 ? `+${amount}` : `${amount}`;
}

async function loadOverview() {
  overviewLoading.value = true;
  try {
    overview.value = await getBillingOverviewApi();
  } catch {
    // requestClient 已统一提示错误，这里仅复位 loading
  } finally {
    overviewLoading.value = false;
  }
}

async function loadTransactions() {
  transactionsLoading.value = true;
  try {
    transactions.value = await listCreditTransactionsApi(8);
  } catch {
    // requestClient 已统一提示错误，这里仅复位 loading
  } finally {
    transactionsLoading.value = false;
  }
}

function goRecharge() {
  router.push('/account/recharge');
}

function goTransactions() {
  router.push('/account/transactions');
}

onMounted(() => {
  void loadOverview();
  void loadTransactions();
});
</script>

<template>
  <div class="p-5">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card :bordered="false" :loading="overviewLoading">
        <Statistic :value="availableCredits" title="可用积分" />
      </Card>
      <Card :bordered="false" :loading="overviewLoading">
        <Statistic :value="frozenCredits" title="冻结积分" />
      </Card>
      <Card :bordered="false" :loading="overviewLoading">
        <Statistic :value="pendingOrderCount" title="待支付订单" />
      </Card>
    </div>

    <Card :bordered="false" class="mt-4" title="快捷操作">
      <div class="flex flex-wrap items-center gap-4">
        <Button type="primary" @click="goRecharge">去充值</Button>
        <Button @click="goTransactions">查看流水</Button>
        <span class="text-sm text-gray-500">
          积分用于生成图片：标准 10 积分/张、高清 35 积分/张、省积分 3 积分/张。
        </span>
      </div>
    </Card>

    <Card :bordered="false" class="mt-4" title="最近流水">
      <Table
        :columns="transactionColumns"
        :data-source="transactions"
        :loading="transactionsLoading"
        :pagination="false"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'createdAt'">
            {{ formatDateTime(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'type'">
            <Tag :color="getTransactionMeta(record.type).color">
              {{ getTransactionMeta(record.type).label }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'amount'">
            <span :class="record.amount > 0 ? 'text-green-600' : 'text-red-500'">
              {{ formatAmount(record.amount) }}
            </span>
          </template>
          <template v-else-if="column.key === 'memo'">
            {{ record.memo || '-' }}
          </template>
        </template>
      </Table>
      <div class="mt-3 text-right">
        <a @click="goTransactions">查看全部</a>
      </div>
    </Card>
  </div>
</template>
