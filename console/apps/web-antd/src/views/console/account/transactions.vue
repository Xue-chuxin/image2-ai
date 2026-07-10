<script lang="ts" setup>
import type { CreditTransactionView } from '#/api/console/billing';

import { computed, onMounted, ref } from 'vue';

import { Button, Card, Empty, Statistic, Table, Tag } from 'ant-design-vue';

import { listCreditTransactionsApi } from '#/api/console/billing';

defineOptions({ name: 'AccountTransactions' });

const loading = ref(false);
const transactions = ref<CreditTransactionView[]>([]);

const typeMeta: Record<
  CreditTransactionView['type'],
  { color: string; label: string }
> = {
  GRANT: { color: 'cyan', label: '注册赠送' },
  FREEZE: { color: 'warning', label: '任务冻结' },
  SPEND: { color: 'processing', label: '生成扣除' },
  REFUND: { color: 'default', label: '失败退回' },
  PURCHASE: { color: 'success', label: '充值到账' },
  ADJUSTMENT: { color: 'purple', label: '人工调整' },
};

const totalIncome = computed(() =>
  transactions.value.reduce(
    (sum, item) => (item.amount > 0 ? sum + item.amount : sum),
    0,
  ),
);

const totalExpense = computed(() =>
  transactions.value.reduce(
    (sum, item) => (item.amount < 0 ? sum + Math.abs(item.amount) : sum),
    0,
  ),
);

const columns = [
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 110 },
  { title: '变动', dataIndex: 'amount', key: 'amount', width: 110 },
  { title: '变动后余额', dataIndex: 'balance', key: 'balance', width: 120 },
  { title: '备注', dataIndex: 'memo', key: 'memo' },
  { title: '关联', key: 'relation', width: 120 },
];

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

function formatAmount(amount: number) {
  return amount > 0 ? `+${amount}` : `${amount}`;
}

async function loadTransactions() {
  loading.value = true;
  try {
    transactions.value = await listCreditTransactionsApi(100);
  } catch {
    // requestClient 已提示错误，这里只需收尾 loading
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadTransactions();
});
</script>

<template>
  <div class="p-5">
    <Card :bordered="false">
      <template #title>
        <span>积分流水</span>
      </template>
      <template #extra>
        <Button :loading="loading" type="primary" @click="loadTransactions">
          刷新
        </Button>
      </template>

      <div class="mb-4 flex flex-wrap items-end gap-10">
        <Statistic
          :value="totalIncome"
          :value-style="{ color: '#52c41a' }"
          prefix="+"
          title="本页累计收入"
        />
        <Statistic
          :value="totalExpense"
          :value-style="{ color: '#ff4d4f' }"
          prefix="-"
          title="本页累计支出"
        />
        <span class="pb-1 text-xs text-gray-400">仅统计当前列表</span>
      </div>

      <Table
        :columns="columns"
        :data-source="transactions"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: false }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'createdAt'">
            {{ formatTime(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'type'">
            <Tag :color="typeMeta[record.type as CreditTransactionView['type']]?.color">
              {{
                typeMeta[record.type as CreditTransactionView['type']]?.label ??
                record.type
              }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'amount'">
            <span
              :class="record.amount > 0 ? 'text-green-600' : 'text-red-500'"
              class="font-mono font-medium"
            >
              {{ formatAmount(record.amount) }}
            </span>
          </template>
          <template v-else-if="column.key === 'balance'">
            <span class="font-mono">{{ record.balance }}</span>
          </template>
          <template v-else-if="column.key === 'memo'">
            {{ record.memo || '—' }}
          </template>
          <template v-else-if="column.key === 'relation'">
            <Tag v-if="record.jobId" class="text-xs" color="blue">
              生图任务
            </Tag>
            <Tag v-else-if="record.orderId" class="text-xs" color="gold">
              充值订单
            </Tag>
            <span v-else>—</span>
          </template>
        </template>
        <template #emptyText>
          <Empty description="暂无积分流水" />
        </template>
      </Table>
    </Card>
  </div>
</template>
