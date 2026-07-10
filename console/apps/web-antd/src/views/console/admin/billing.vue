<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  InputPassword,
  message,
  Select,
  Statistic,
  Switch,
  Table,
  TabPane,
  Tabs,
  Tag,
  Textarea,
} from 'ant-design-vue';

import { adminRequestClient } from '#/api/admin-request';

defineOptions({ name: 'AdminBilling' });

/** 支付渠道配置（密钥字段仅回传 *Configured 布尔，输入留空表示不修改） */
interface EpaySettings {
  enabled: boolean;
  displayName: string;
  gatewayUrl: string;
  pid: string;
  defaultType: string;
  keyConfigured: boolean;
  key?: string;
}

interface AlipayF2fSettings {
  enabled: boolean;
  displayName: string;
  gatewayUrl: string;
  appId: string;
  privateKeyConfigured: boolean;
  alipayPublicKeyConfigured: boolean;
  privateKey?: string;
  alipayPublicKey?: string;
}

interface WechatPaySettings {
  enabled: boolean;
  displayName: string;
  mchId: string;
  appId: string;
  serialNo: string;
  privateKeyConfigured: boolean;
  apiV3KeyConfigured: boolean;
  platformPublicKeyConfigured: boolean;
  privateKey?: string;
  apiV3Key?: string;
  platformPublicKey?: string;
}

interface PaypalSettings {
  enabled: boolean;
  displayName: string;
  mode: 'production' | 'sandbox';
  clientId: string;
  secretConfigured: boolean;
  secret?: string;
}

interface PaymentProviderSettings {
  epay: EpaySettings;
  alipayF2f: AlipayF2fSettings;
  wechatPay: WechatPaySettings;
  paypal: PaypalSettings;
}

interface CreditPackageView {
  id: string;
  name: string;
  description: null | string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  priceCents: number;
  currency: string;
  packageType: 'RECHARGE' | 'SUBSCRIPTION';
  durationDays: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type RechargeOrderStatus = 'CANCELED' | 'EXPIRED' | 'PAID' | 'PENDING';

interface RechargeOrderView {
  id: string;
  orderNo: string;
  userId: string;
  userEmail: null | string;
  packageNameSnapshot: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  amountCents: number;
  currency: string;
  status: RechargeOrderStatus;
  provider: string;
  providerTradeNo: null | string;
  notifyPayloadDigest: null | string;
  paidAt: null | string;
  createdAt: string;
}

interface PackageFormState {
  id: string;
  name: string;
  description: string;
  credits: number;
  bonusCredits: number;
  priceYuan: number;
  packageType: 'RECHARGE' | 'SUBSCRIPTION';
  durationDays: number;
  sortOrder: number;
  isActive: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  alipay_f2f: '支付宝当面付',
  epay: '易支付',
  manual: '人工',
  paypal: 'PayPal',
  wechat_pay: '微信支付',
};

const STATUS_META: Record<RechargeOrderStatus, { color: string; text: string }> =
  {
    CANCELED: { color: 'default', text: '已取消' },
    EXPIRED: { color: 'error', text: '已过期' },
    PAID: { color: 'success', text: '已到账' },
    PENDING: { color: 'warning', text: '待支付' },
  };

const STATUS_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '待支付', value: 'PENDING' },
  { label: '已到账', value: 'PAID' },
  { label: '已取消', value: 'CANCELED' },
  { label: '已过期', value: 'EXPIRED' },
];

const EPAY_TYPE_OPTIONS = [
  { label: '支付宝（alipay）', value: 'alipay' },
  { label: '微信（wxpay）', value: 'wxpay' },
  { label: 'QQ 钱包（qqpay）', value: 'qqpay' },
];

const PAYPAL_MODE_OPTIONS = [
  { label: 'Sandbox（沙箱）', value: 'sandbox' },
  { label: 'Production（生产）', value: 'production' },
];

function createEmptySettings(): PaymentProviderSettings {
  return {
    alipayF2f: {
      alipayPublicKey: '',
      alipayPublicKeyConfigured: false,
      appId: '',
      displayName: '支付宝当面付',
      enabled: false,
      gatewayUrl: '',
      privateKey: '',
      privateKeyConfigured: false,
    },
    epay: {
      defaultType: 'alipay',
      displayName: '易支付',
      enabled: false,
      gatewayUrl: '',
      key: '',
      keyConfigured: false,
      pid: '',
    },
    paypal: {
      clientId: '',
      displayName: 'PayPal',
      enabled: false,
      mode: 'sandbox',
      secret: '',
      secretConfigured: false,
    },
    wechatPay: {
      apiV3Key: '',
      apiV3KeyConfigured: false,
      appId: '',
      displayName: '微信支付',
      enabled: false,
      mchId: '',
      platformPublicKey: '',
      platformPublicKeyConfigured: false,
      privateKey: '',
      privateKeyConfigured: false,
      serialNo: '',
    },
  };
}

function createEmptyPackageForm(): PackageFormState {
  return {
    bonusCredits: 0,
    credits: 100,
    description: '',
    durationDays: 0,
    id: '',
    isActive: true,
    name: '',
    packageType: 'RECHARGE',
    priceYuan: 12.9,
    sortOrder: 0,
  };
}

const activeTab = ref('providers');

/** 支付渠道 */
const settingsLoading = ref(false);
const savingSettings = ref(false);
const settingsForm = reactive<PaymentProviderSettings>(createEmptySettings());

/** 积分套餐 */
const packagesLoading = ref(false);
const savingPackage = ref(false);
const packages = ref<CreditPackageView[]>([]);
const packageForm = reactive<PackageFormState>(createEmptyPackageForm());
/** 行级操作 loading（上下架切换） */
const rowLoading = reactive<Record<string, boolean>>({});

/** 充值订单 */
const ordersLoading = ref(false);
const orders = ref<RechargeOrderView[]>([]);
const orderStatus = ref('all');
const orderQuery = ref('');

const stats = computed(() => ({
  activePackages: packages.value.filter((pkg) => pkg.isActive).length,
  packages: packages.value.length,
  paidAmountYuan:
    orders.value
      .filter((order) => order.status === 'PAID')
      .reduce((sum, order) => sum + order.amountCents, 0) / 100,
  pendingOrders: orders.value.filter((order) => order.status === 'PENDING')
    .length,
}));

function formatCurrency(cents: number, currency = 'CNY') {
  const value = (cents / 100).toFixed(2);
  return currency === 'CNY' ? `¥${value}` : `${currency} ${value}`;
}

function formatTime(value: null | string) {
  return value ? new Date(value).toLocaleString('zh-CN') : '—';
}

function providerLabel(provider: string) {
  return PROVIDER_LABELS[provider] ?? provider;
}

/** 把接口返回的配置写回表单，并清空密钥输入框（留空 = 不修改） */
function applySettings(settings: PaymentProviderSettings) {
  Object.assign(settingsForm.epay, settings.epay, { key: '' });
  Object.assign(settingsForm.alipayF2f, settings.alipayF2f, {
    alipayPublicKey: '',
    privateKey: '',
  });
  Object.assign(settingsForm.wechatPay, settings.wechatPay, {
    apiV3Key: '',
    platformPublicKey: '',
    privateKey: '',
  });
  Object.assign(settingsForm.paypal, settings.paypal, { secret: '' });
}

async function loadSettings() {
  settingsLoading.value = true;
  try {
    const data = await adminRequestClient.get<{
      ok: boolean;
      settings: PaymentProviderSettings;
    }>('/admin/billing/settings');
    applySettings(data.settings);
  } catch {
    // adminRequestClient 已统一提示错误
  } finally {
    settingsLoading.value = false;
  }
}

async function saveSettings() {
  savingSettings.value = true;
  try {
    const data = await adminRequestClient.post<{
      ok: boolean;
      settings: PaymentProviderSettings;
    }>('/admin/billing/settings', settingsForm);
    applySettings(data.settings);
    message.success('支付渠道配置已保存。密钥输入框留空表示不修改原密钥。');
  } catch {
    // 错误已提示
  } finally {
    savingSettings.value = false;
  }
}

async function loadPackages() {
  packagesLoading.value = true;
  try {
    const data = await adminRequestClient.get<{
      ok: boolean;
      packages: CreditPackageView[];
    }>('/admin/billing/packages');
    packages.value = data.packages;
  } catch {
    // 错误已提示
  } finally {
    packagesLoading.value = false;
  }
}

/** 新建 / 更新套餐（价格以元提交，后端转分） */
async function savePackage(input: PackageFormState) {
  const data = await adminRequestClient.post<{
    ok: boolean;
    package: CreditPackageView;
  }>('/admin/billing/packages', {
    bonusCredits: input.bonusCredits,
    credits: input.credits,
    description: input.description,
    durationDays: input.durationDays,
    id: input.id || undefined,
    isActive: input.isActive,
    name: input.name,
    packageType: input.packageType,
    priceYuan: input.priceYuan,
    sortOrder: input.sortOrder,
  });
  const saved = data.package;
  const exists = packages.value.some((pkg) => pkg.id === saved.id);
  packages.value = (
    exists
      ? packages.value.map((pkg) => (pkg.id === saved.id ? saved : pkg))
      : [...packages.value, saved]
  ).sort((a, b) => a.sortOrder - b.sortOrder);
  return saved;
}

async function submitPackageForm() {
  if (!packageForm.name.trim()) {
    message.warning('请填写套餐名称');
    return;
  }
  savingPackage.value = true;
  try {
    await savePackage({ ...packageForm });
    Object.assign(packageForm, createEmptyPackageForm());
    message.success('套餐已保存。');
  } catch {
    // 错误已提示
  } finally {
    savingPackage.value = false;
  }
}

function resetPackageForm() {
  Object.assign(packageForm, createEmptyPackageForm());
}

/** 编辑回填 */
function editPackage(pkg: CreditPackageView) {
  Object.assign(packageForm, {
    bonusCredits: pkg.bonusCredits,
    credits: pkg.credits,
    description: pkg.description ?? '',
    durationDays: pkg.durationDays ?? 0,
    id: pkg.id,
    isActive: pkg.isActive,
    name: pkg.name,
    packageType: pkg.packageType ?? 'RECHARGE',
    priceYuan: pkg.priceCents / 100,
    sortOrder: pkg.sortOrder,
  });
}

/** 上下架切换 = 提交 isActive 取反后的完整套餐 */
async function togglePackage(pkg: CreditPackageView) {
  rowLoading[pkg.id] = true;
  try {
    await savePackage({
      bonusCredits: pkg.bonusCredits,
      credits: pkg.credits,
      description: pkg.description ?? '',
      durationDays: pkg.durationDays ?? 0,
      id: pkg.id,
      isActive: !pkg.isActive,
      name: pkg.name,
      packageType: pkg.packageType ?? 'RECHARGE',
      priceYuan: pkg.priceCents / 100,
      sortOrder: pkg.sortOrder,
    });
    message.success(pkg.isActive ? '套餐已下架。' : '套餐已上架。');
  } catch {
    // 错误已提示
  } finally {
    rowLoading[pkg.id] = false;
  }
}

async function loadOrders() {
  ordersLoading.value = true;
  try {
    const params: Record<string, number | string> = { limit: 80 };
    if (orderStatus.value !== 'all') params.status = orderStatus.value;
    if (orderQuery.value.trim()) params.q = orderQuery.value.trim();
    const data = await adminRequestClient.get<{
      ok: boolean;
      orders: RechargeOrderView[];
    }>('/admin/billing/orders', { params });
    orders.value = data.orders;
  } catch {
    // 错误已提示
  } finally {
    ordersLoading.value = false;
  }
}

const packageColumns: TableColumnsType = [
  { key: 'name', minWidth: 240, title: '套餐' },
  { dataIndex: 'totalCredits', key: 'totalCredits', title: '总积分', width: 110 },
  { key: 'price', title: '价格', width: 110 },
  { dataIndex: 'sortOrder', key: 'sortOrder', title: '排序', width: 80 },
  { key: 'isActive', title: '状态', width: 100 },
  { key: 'action', title: '操作', width: 160 },
];

const orderColumns: TableColumnsType = [
  { key: 'orderNo', title: '订单号', width: 230 },
  { key: 'userEmail', title: '用户邮箱', width: 200 },
  { dataIndex: 'packageNameSnapshot', key: 'package', title: '套餐', width: 160 },
  { key: 'amount', title: '金额', width: 110 },
  { key: 'credits', title: '积分', width: 140 },
  { key: 'provider', title: '渠道', width: 130 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'paidAt', title: '支付时间', width: 170 },
  { key: 'createdAt', title: '创建时间', width: 170 },
];

onMounted(() => {
  loadSettings();
  loadPackages();
  loadOrders();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card :bordered="false">
        <Statistic :value="stats.packages" title="套餐" />
      </Card>
      <Card :bordered="false">
        <Statistic :value="stats.activePackages" title="上架" />
      </Card>
      <Card :bordered="false">
        <Statistic :value="stats.pendingOrders" title="待支付" />
      </Card>
      <Card :bordered="false">
        <Statistic
          :precision="2"
          :value="stats.paidAmountYuan"
          prefix="¥"
          title="到账金额"
        />
      </Card>
    </div>

    <Card :bordered="false" :loading="settingsLoading && activeTab === 'providers'">
      <Tabs v-model:active-key="activeTab">
        <!-- 支付渠道 -->
        <TabPane key="providers" tab="支付渠道">
          <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <!-- 易支付 -->
            <Card size="small" title="易支付">
              <template #extra>
                <span class="mr-2 text-xs text-gray-500">启用</span>
                <Switch v-model:checked="settingsForm.epay.enabled" />
              </template>
              <div class="flex flex-col gap-3">
                <div>
                  <div class="mb-1 text-sm text-gray-600">显示名称</div>
                  <Input v-model:value="settingsForm.epay.displayName" />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">支付类型</div>
                  <Select
                    v-model:value="settingsForm.epay.defaultType"
                    :options="EPAY_TYPE_OPTIONS"
                    class="w-full"
                  />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">网关地址</div>
                  <Input
                    v-model:value="settingsForm.epay.gatewayUrl"
                    placeholder="https://example.com/"
                  />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">商户 PID</div>
                  <Input v-model:value="settingsForm.epay.pid" />
                </div>
                <div>
                  <div class="mb-1 flex items-center gap-2 text-sm text-gray-600">
                    商户 Key
                    <Tag v-if="settingsForm.epay.keyConfigured" color="success">
                      已配置
                    </Tag>
                  </div>
                  <InputPassword
                    v-model:value="settingsForm.epay.key"
                    placeholder="留空不修改"
                  />
                </div>
              </div>
            </Card>

            <!-- 支付宝当面付 -->
            <Card size="small" title="支付宝当面付">
              <template #extra>
                <span class="mr-2 text-xs text-gray-500">启用</span>
                <Switch v-model:checked="settingsForm.alipayF2f.enabled" />
              </template>
              <div class="flex flex-col gap-3">
                <div>
                  <div class="mb-1 text-sm text-gray-600">显示名称</div>
                  <Input v-model:value="settingsForm.alipayF2f.displayName" />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">网关地址</div>
                  <Input v-model:value="settingsForm.alipayF2f.gatewayUrl" />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">App ID</div>
                  <Input v-model:value="settingsForm.alipayF2f.appId" />
                </div>
                <div>
                  <div class="mb-1 flex items-center gap-2 text-sm text-gray-600">
                    应用私钥
                    <Tag
                      v-if="settingsForm.alipayF2f.privateKeyConfigured"
                      color="success"
                    >
                      已配置
                    </Tag>
                  </div>
                  <Textarea
                    v-model:value="settingsForm.alipayF2f.privateKey"
                    :auto-size="{ maxRows: 6, minRows: 3 }"
                    placeholder="支持粘贴支付宝应用私钥内容或完整 PEM，留空不修改"
                  />
                </div>
                <div>
                  <div class="mb-1 flex items-center gap-2 text-sm text-gray-600">
                    支付宝公钥
                    <Tag
                      v-if="settingsForm.alipayF2f.alipayPublicKeyConfigured"
                      color="success"
                    >
                      已配置
                    </Tag>
                  </div>
                  <Textarea
                    v-model:value="settingsForm.alipayF2f.alipayPublicKey"
                    :auto-size="{ maxRows: 6, minRows: 3 }"
                    placeholder="支持粘贴支付宝公钥内容或完整 PEM，留空不修改"
                  />
                </div>
              </div>
            </Card>

            <!-- 微信支付 -->
            <Card size="small" title="微信支付">
              <template #extra>
                <span class="mr-2 text-xs text-gray-500">启用</span>
                <Switch v-model:checked="settingsForm.wechatPay.enabled" />
              </template>
              <div class="flex flex-col gap-3">
                <div>
                  <div class="mb-1 text-sm text-gray-600">显示名称</div>
                  <Input v-model:value="settingsForm.wechatPay.displayName" />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">商户号</div>
                  <Input v-model:value="settingsForm.wechatPay.mchId" />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">App ID</div>
                  <Input v-model:value="settingsForm.wechatPay.appId" />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">证书序列号</div>
                  <Input v-model:value="settingsForm.wechatPay.serialNo" />
                </div>
                <div>
                  <div class="mb-1 flex items-center gap-2 text-sm text-gray-600">
                    商户私钥
                    <Tag
                      v-if="settingsForm.wechatPay.privateKeyConfigured"
                      color="success"
                    >
                      已配置
                    </Tag>
                  </div>
                  <Textarea
                    v-model:value="settingsForm.wechatPay.privateKey"
                    :auto-size="{ maxRows: 6, minRows: 3 }"
                    placeholder="留空不修改"
                  />
                </div>
                <div>
                  <div class="mb-1 flex items-center gap-2 text-sm text-gray-600">
                    APIv3 Key
                    <Tag
                      v-if="settingsForm.wechatPay.apiV3KeyConfigured"
                      color="success"
                    >
                      已配置
                    </Tag>
                  </div>
                  <InputPassword
                    v-model:value="settingsForm.wechatPay.apiV3Key"
                    placeholder="留空不修改"
                  />
                </div>
                <div>
                  <div class="mb-1 flex items-center gap-2 text-sm text-gray-600">
                    平台公钥
                    <Tag
                      v-if="settingsForm.wechatPay.platformPublicKeyConfigured"
                      color="success"
                    >
                      已配置
                    </Tag>
                  </div>
                  <Textarea
                    v-model:value="settingsForm.wechatPay.platformPublicKey"
                    :auto-size="{ maxRows: 6, minRows: 3 }"
                    placeholder="留空不修改"
                  />
                </div>
              </div>
            </Card>

            <!-- PayPal -->
            <Card size="small" title="PayPal">
              <template #extra>
                <span class="mr-2 text-xs text-gray-500">启用</span>
                <Switch v-model:checked="settingsForm.paypal.enabled" />
              </template>
              <div class="flex flex-col gap-3">
                <div>
                  <div class="mb-1 text-sm text-gray-600">显示名称</div>
                  <Input v-model:value="settingsForm.paypal.displayName" />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">模式</div>
                  <Select
                    v-model:value="settingsForm.paypal.mode"
                    :options="PAYPAL_MODE_OPTIONS"
                    class="w-full"
                  />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">Client ID</div>
                  <Input v-model:value="settingsForm.paypal.clientId" />
                </div>
                <div>
                  <div class="mb-1 flex items-center gap-2 text-sm text-gray-600">
                    Secret
                    <Tag v-if="settingsForm.paypal.secretConfigured" color="success">
                      已配置
                    </Tag>
                  </div>
                  <InputPassword
                    v-model:value="settingsForm.paypal.secret"
                    placeholder="留空不修改"
                  />
                </div>
              </div>
            </Card>
          </div>

          <div class="mt-4 flex justify-end">
            <Button :loading="savingSettings" type="primary" @click="saveSettings">
              保存支付渠道配置
            </Button>
          </div>
        </TabPane>

        <!-- 积分套餐 -->
        <TabPane key="packages" tab="积分套餐">
          <div class="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
            <Card
              :title="packageForm.id ? '编辑套餐' : '新增套餐'"
              size="small"
            >
              <div class="flex flex-col gap-3">
                <div>
                  <div class="mb-1 text-sm text-gray-600">套餐名称</div>
                  <Input
                    v-model:value="packageForm.name"
                    placeholder="入门包"
                  />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">描述</div>
                  <Input
                    v-model:value="packageForm.description"
                    placeholder="适合轻量体验"
                  />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">基础积分</div>
                  <InputNumber
                    v-model:value="packageForm.credits"
                    :min="0"
                    :precision="0"
                    class="w-full"
                  />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">赠送积分</div>
                  <InputNumber
                    v-model:value="packageForm.bonusCredits"
                    :min="0"
                    :precision="0"
                    class="w-full"
                  />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">价格（元）</div>
                  <InputNumber
                    v-model:value="packageForm.priceYuan"
                    :min="0"
                    :precision="2"
                    class="w-full"
                  />
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">套餐类型</div>
                  <Select
                    v-model:value="packageForm.packageType"
                    :options="[
                      { label: '充值包（一次性）', value: 'RECHARGE' },
                      { label: '会员卡（周期）', value: 'SUBSCRIPTION' },
                    ]"
                    class="w-full"
                  />
                </div>
                <div v-if="packageForm.packageType === 'SUBSCRIPTION'">
                  <div class="mb-1 text-sm text-gray-600">会员有效天数</div>
                  <InputNumber
                    v-model:value="packageForm.durationDays"
                    :min="1"
                    :precision="0"
                    class="w-full"
                    placeholder="月卡填 30、年卡填 365"
                  />
                  <div class="mt-1 text-xs text-gray-400">
                    购买后按此天数续期会员；会员卡同样即时发放上面配置的积分。
                  </div>
                </div>
                <div>
                  <div class="mb-1 text-sm text-gray-600">排序</div>
                  <InputNumber
                    v-model:value="packageForm.sortOrder"
                    :precision="0"
                    class="w-full"
                  />
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">上架套餐</span>
                  <Switch v-model:checked="packageForm.isActive" />
                </div>
                <div class="flex gap-2">
                  <Button
                    :loading="savingPackage"
                    type="primary"
                    @click="submitPackageForm"
                  >
                    保存套餐
                  </Button>
                  <Button @click="resetPackageForm">清空</Button>
                </div>
              </div>
            </Card>

            <Table
              :columns="packageColumns"
              :data-source="packages"
              :loading="packagesLoading"
              :pagination="{ pageSize: 10, showSizeChanger: false }"
              :scroll="{ x: 900 }"
              row-key="id"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'name'">
                  <div>
                    <p class="font-medium">{{ record.name }}</p>
                    <p class="text-xs text-gray-400">
                      {{ record.description || '无描述' }}
                    </p>
                  </div>
                </template>

                <template v-else-if="column.key === 'price'">
                  {{ formatCurrency(record.priceCents, record.currency) }}
                </template>

                <template v-else-if="column.key === 'isActive'">
                  <Tag :color="record.isActive ? 'success' : 'default'">
                    {{ record.isActive ? '已上架' : '已下架' }}
                  </Tag>
                </template>

                <template v-else-if="column.key === 'action'">
                  <Button
                    size="small"
                    type="link"
                    @click="editPackage(record as CreditPackageView)"
                  >
                    编辑
                  </Button>
                  <Button
                    :danger="record.isActive"
                    :loading="rowLoading[record.id]"
                    size="small"
                    type="link"
                    @click="togglePackage(record as CreditPackageView)"
                  >
                    {{ record.isActive ? '下架' : '上架' }}
                  </Button>
                </template>
              </template>

              <template #emptyText>
                <Empty description="暂无套餐" />
              </template>
            </Table>
          </div>
        </TabPane>

        <!-- 充值订单 -->
        <TabPane key="orders" tab="充值订单">
          <div class="mb-4 flex flex-wrap items-center gap-3">
            <span class="text-sm text-gray-600">状态</span>
            <Select
              v-model:value="orderStatus"
              :options="STATUS_OPTIONS"
              class="w-32"
              @change="loadOrders"
            />
            <span class="text-sm text-gray-600">搜索</span>
            <Input
              v-model:value="orderQuery"
              allow-clear
              class="w-64"
              placeholder="订单号、邮箱、套餐、渠道"
              @press-enter="loadOrders"
            />
            <Button :loading="ordersLoading" type="primary" @click="loadOrders">
              搜索
            </Button>
          </div>

          <Table
            :columns="orderColumns"
            :data-source="orders"
            :loading="ordersLoading"
            :pagination="{ pageSize: 10, showSizeChanger: false }"
            :scroll="{ x: 1400 }"
            row-key="id"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'orderNo'">
                <code class="text-xs text-gray-500">{{ record.orderNo }}</code>
              </template>

              <template v-else-if="column.key === 'userEmail'">
                {{ record.userEmail || record.userId }}
              </template>

              <template v-else-if="column.key === 'amount'">
                {{ formatCurrency(record.amountCents, record.currency) }}
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
                <Tag>{{ providerLabel(record.provider) }}</Tag>
              </template>

              <template v-else-if="column.key === 'status'">
                <Tag
                  :color="STATUS_META[record.status as RechargeOrderStatus].color"
                >
                  {{ STATUS_META[record.status as RechargeOrderStatus].text }}
                </Tag>
              </template>

              <template v-else-if="column.key === 'paidAt'">
                {{ formatTime(record.paidAt) }}
              </template>

              <template v-else-if="column.key === 'createdAt'">
                {{ formatTime(record.createdAt) }}
              </template>
            </template>

            <template #emptyText>
              <Empty description="暂无订单" />
            </template>
          </Table>
        </TabPane>
      </Tabs>
    </Card>
  </div>
</template>
