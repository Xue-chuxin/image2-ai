import { requestClient } from '#/api/request';

export interface CreditBalance {
  available: number;
  frozen: number;
}

export interface CreditPackageView {
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

export interface RechargeOrderView {
  id: string;
  orderNo: string;
  packageId: null | string;
  packageNameSnapshot: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  packageType: 'RECHARGE' | 'SUBSCRIPTION';
  durationDays: number;
  amountCents: number;
  currency: string;
  status: 'CANCELED' | 'EXPIRED' | 'PAID' | 'PENDING';
  provider: string;
  paymentUrl: null | string;
  qrCodeUrl: null | string;
  providerTradeNo: null | string;
  paidAt: null | string;
  expiresAt: null | string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentChannelView {
  provider: 'alipay_f2f' | 'epay' | 'paypal' | 'wechat_pay';
  label: string;
  enabled: boolean;
  configured: boolean;
  mode?: 'production' | 'sandbox';
}

export interface SubscriptionView {
  packageName: string;
  startedAt: string;
  expiresAt: string;
  active: boolean;
  daysRemaining: number;
}

export interface MembershipBenefitsView {
  discountPercent: number;
  dailyCredits: number;
  generationRateLimit: number;
}

export interface BillingOverview {
  balance: CreditBalance;
  packages: CreditPackageView[];
  orders: RechargeOrderView[];
  channels: PaymentChannelView[];
  subscription: SubscriptionView | null;
  membershipBenefits: MembershipBenefitsView;
}

export interface CreditTransactionView {
  id: string;
  type: 'ADJUSTMENT' | 'FREEZE' | 'GRANT' | 'PURCHASE' | 'REFUND' | 'SPEND';
  amount: number;
  balance: number;
  memo: null | string;
  jobId: null | string;
  orderId: null | string;
  createdAt: string;
}

/** 账户概览（余额 + 套餐 + 订单 + 支付渠道），服务端会顺带查单与过期处理 */
export async function getBillingOverviewApi(options?: {
  mode?: 'auto' | 'manual';
  orderIds?: string[];
}) {
  const params: Record<string, string> = {};
  if (options?.orderIds?.length) {
    params.orderIds = options.orderIds.join(',');
  }
  if (options?.mode) {
    params.mode = options.mode;
  }
  return requestClient.get<BillingOverview>('/console/billing/overview', {
    params,
  });
}

/** 创建充值订单 */
export async function createRechargeOrderApi(data: {
  packageId: string;
  provider: string;
}) {
  return requestClient.post<RechargeOrderView>('/console/billing/orders', data);
}

/** 刷新单个订单状态（mode=manual 会强制向支付网关查单） */
export async function getRechargeOrderApi(
  id: string,
  mode: 'auto' | 'manual' = 'auto',
) {
  return requestClient.get<RechargeOrderView & { totalCredits: number }>(
    `/console/billing/orders/${id}`,
    { params: { mode } },
  );
}

/** 取消待支付订单 */
export async function cancelRechargeOrderApi(id: string) {
  return requestClient.post<RechargeOrderView>(
    `/console/billing/orders/${id}/cancel`,
  );
}

/** 积分流水 */
export async function listCreditTransactionsApi(limit = 50) {
  return requestClient.get<CreditTransactionView[]>(
    '/console/billing/transactions',
    { params: { limit } },
  );
}

/** 修改密码 */
export async function changePasswordApi(data: {
  currentPassword: string;
  newPassword: string;
}) {
  return requestClient.post<boolean>('/console/user/password', data);
}

export interface OAuthBindingView {
  provider: 'github' | 'google';
  label: string;
  email: null | string;
  displayName: null | string;
  createdAt: string;
}

export interface OAuthProviderOption {
  provider: 'github' | 'google';
  label: string;
}

export interface OAuthAccountsView {
  bindings: OAuthBindingView[];
  providers: OAuthProviderOption[];
  hasPassword: boolean;
  isAdmin: boolean;
}

/** 第三方账号绑定情况（已绑定列表 + 可绑定渠道） */
export async function getOAuthAccountsApi() {
  return requestClient.get<OAuthAccountsView>('/console/user/oauth/accounts');
}

/** 解绑第三方账号 */
export async function unbindOAuthAccountApi(provider: string) {
  return requestClient.post<boolean>(`/console/user/oauth/${provider}/unbind`);
}
