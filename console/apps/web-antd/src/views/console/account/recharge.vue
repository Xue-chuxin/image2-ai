<script lang="ts" setup>
import type {
  BillingOverview,
  CreditPackageView,
  PaymentChannelView,
  RechargeOrderView,
} from '#/api/console/billing';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Card,
  Empty,
  message,
  Modal,
  QRCode,
  Select,
  Space,
  Spin,
} from 'ant-design-vue';

import {
  cancelRechargeOrderApi,
  createRechargeOrderApi,
  getBillingOverviewApi,
  getRechargeOrderApi,
} from '#/api/console/billing';

defineOptions({ name: 'AccountRecharge' });

const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 2 * 60 * 1000;

const loading = ref(false);
const overview = ref<BillingOverview | null>(null);

const selectedProvider = ref<string | undefined>();
const buyingId = ref('');

const modalOpen = ref(false);
const currentOrder = ref<null | RechargeOrderView>(null);
const refreshing = ref(false);
const canceling = ref(false);

let pollTimer: null | ReturnType<typeof setInterval> = null;
let pollStartedAt = 0;
let pollBusy = false;

const availableBalance = computed(() => overview.value?.balance.available ?? 0);

const availableChannels = computed<PaymentChannelView[]>(
  () =>
    overview.value?.channels.filter(
      (item) => item.enabled && item.configured,
    ) ?? [],
);

const channelOptions = computed(() =>
  availableChannels.value.map((item) => ({
    label: item.label,
    value: item.provider,
  })),
);

const hasChannel = computed(() => availableChannels.value.length > 0);

const packages = computed<CreditPackageView[]>(() =>
  (overview.value?.packages ?? [])
    .filter((item) => item.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder),
);

const qrValue = computed(
  () =>
    currentOrder.value?.qrCodeUrl || currentOrder.value?.paymentUrl || '',
);

const isEpayOrder = computed(() => currentOrder.value?.provider === 'epay');

function formatAmount(cents: number) {
  const yuan = cents / 100;
  return `¥${Number.isInteger(yuan) ? yuan : yuan.toFixed(2)}`;
}

function packageTotal(pkg: CreditPackageView) {
  return pkg.credits + pkg.bonusCredits;
}

async function loadOverview() {
  loading.value = true;
  try {
    overview.value = await getBillingOverviewApi();
    const stillValid = availableChannels.value.some(
      (item) => item.provider === selectedProvider.value,
    );
    if (!stillValid) {
      selectedProvider.value = availableChannels.value[0]?.provider;
    }
  } catch {
    // requestClient 已提示错误，这里只维护 loading 态
  } finally {
    loading.value = false;
  }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  pollBusy = false;
}

function handleOrderStatus(order: RechargeOrderView) {
  currentOrder.value = order;
  if (order.status === 'PAID') {
    stopPolling();
    modalOpen.value = false;
    message.success('积分已到账');
    loadOverview();
    return true;
  }
  if (order.status === 'EXPIRED' || order.status === 'CANCELED') {
    stopPolling();
    modalOpen.value = false;
    message.warning(
      order.status === 'EXPIRED' ? '订单已过期，请重新下单' : '订单已取消',
    );
    return true;
  }
  return false;
}

function startPolling(orderId: string) {
  stopPolling();
  pollStartedAt = Date.now();
  pollTimer = setInterval(async () => {
    if (Date.now() - pollStartedAt >= POLL_TIMEOUT) {
      stopPolling();
      message.info('支付结果查询超时，可到充值订单页继续查看');
      return;
    }
    if (pollBusy) {
      return;
    }
    pollBusy = true;
    try {
      const order = await getRechargeOrderApi(orderId, 'auto');
      handleOrderStatus(order);
    } catch {
      // 轮询失败静默重试，requestClient 已提示错误
    } finally {
      pollBusy = false;
    }
  }, POLL_INTERVAL);
}

async function buy(pkg: CreditPackageView) {
  if (!selectedProvider.value) {
    message.warning('请先选择支付渠道');
    return;
  }
  buyingId.value = pkg.id;
  try {
    const order = await createRechargeOrderApi({
      packageId: pkg.id,
      provider: selectedProvider.value,
    });
    currentOrder.value = order;
    if (order.provider === 'paypal' && order.paymentUrl) {
      window.open(order.paymentUrl);
      message.info('已在新窗口打开 PayPal 支付页面，支付完成后积分自动到账');
      startPolling(order.id);
    } else {
      modalOpen.value = true;
      startPolling(order.id);
    }
  } catch {
    // requestClient 已提示错误
  } finally {
    buyingId.value = '';
  }
}

function openPaymentPage() {
  if (qrValue.value) {
    window.open(qrValue.value);
  }
}

async function refreshOrder() {
  if (!currentOrder.value) {
    return;
  }
  refreshing.value = true;
  try {
    const order = await getRechargeOrderApi(currentOrder.value.id, 'manual');
    const finished = handleOrderStatus(order);
    if (!finished) {
      message.info('暂未查询到支付结果，请稍后再试');
    }
  } catch {
    // requestClient 已提示错误
  } finally {
    refreshing.value = false;
  }
}

async function cancelOrder() {
  if (!currentOrder.value) {
    return;
  }
  canceling.value = true;
  try {
    await cancelRechargeOrderApi(currentOrder.value.id);
    stopPolling();
    modalOpen.value = false;
    message.success('订单已取消');
  } catch {
    // requestClient 已提示错误
  } finally {
    canceling.value = false;
  }
}

watch(modalOpen, (open) => {
  if (!open) {
    stopPolling();
  }
});

onMounted(loadOverview);

onUnmounted(stopPolling);
</script>

<template>
  <div class="p-5">
    <Spin :spinning="loading">
      <Alert
        :message="`当前可用积分：${availableBalance}`"
        description="选择套餐并完成在线支付后，积分将自动到账；如长时间未到账，可在支付弹窗点击「已完成支付」手动刷新，或到充值订单页查看。"
        show-icon
        type="info"
      />

      <Alert
        v-if="!loading && !hasChannel"
        class="mt-4"
        message="管理员尚未配置支付渠道，暂时无法在线充值"
        show-icon
        type="warning"
      />

      <Card :bordered="false" class="mt-4" title="选择支付渠道">
        <Select
          v-model:value="selectedProvider"
          :disabled="!hasChannel"
          :options="channelOptions"
          class="w-64 max-w-full"
          placeholder="请选择支付渠道"
        />
      </Card>

      <Card :bordered="false" class="mt-4" title="选择充值套餐">
        <Empty
          v-if="!loading && packages.length === 0"
          description="暂无可购买的充值套餐"
        />
        <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card
            v-for="pkg in packages"
            :key="pkg.id"
            :hoverable="true"
            class="flex flex-col"
          >
            <div class="text-base font-semibold">{{ pkg.name }}</div>
            <p class="mt-1 min-h-5 text-sm text-gray-500">
              {{ pkg.description || '—' }}
            </p>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-3xl font-bold">{{ packageTotal(pkg) }}</span>
              <span class="text-sm text-gray-500">积分</span>
            </div>
            <p v-if="pkg.bonusCredits > 0" class="mt-1 text-xs text-orange-500">
              含赠送 {{ pkg.bonusCredits }}
            </p>
            <div class="mt-3 text-lg font-medium">
              {{ formatAmount(pkg.priceCents) }}
            </div>
            <Button
              :disabled="!hasChannel"
              :loading="buyingId === pkg.id"
              class="mt-4 w-full"
              type="primary"
              @click="buy(pkg)"
            >
              立即购买
            </Button>
          </Card>
        </div>
      </Card>
    </Spin>

    <Modal
      v-model:open="modalOpen"
      :footer="null"
      :mask-closable="false"
      :width="380"
      title="扫码支付"
    >
      <div v-if="currentOrder" class="flex flex-col items-center gap-3 py-2">
        <QRCode v-if="qrValue" :size="220" :value="qrValue" />
        <div class="w-full text-sm text-gray-600">
          <p>订单号：{{ currentOrder.orderNo }}</p>
          <p class="mt-1">
            金额：{{ formatAmount(currentOrder.amountCents) }}
          </p>
          <p class="mt-1">套餐：{{ currentOrder.packageNameSnapshot }}</p>
        </div>
        <Alert
          v-if="isEpayOrder"
          class="w-full"
          message="如无法扫码，可直接打开支付页面完成付款"
          show-icon
          type="info"
        />
        <Space class="mt-1">
          <Button v-if="isEpayOrder" @click="openPaymentPage">
            打开支付页面
          </Button>
          <Button :loading="refreshing" type="primary" @click="refreshOrder">
            已完成支付
          </Button>
          <Button :loading="canceling" danger @click="cancelOrder">
            取消订单
          </Button>
        </Space>
      </div>
    </Modal>
  </div>
</template>
