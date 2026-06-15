"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Alert, Button, Card, Form, Input, InputNumber, Select, Space, Statistic, Switch, Table, Tabs, Tag, Textarea } from "tdesign-react";
import type { BillingPaymentSettings, CreditPackageView, RechargeOrderView } from "@/lib/billing";

type BillingPayload = {
  ok: boolean;
  packages?: CreditPackageView[];
  package?: CreditPackageView;
  orders?: RechargeOrderView[];
  settings?: BillingPaymentSettings;
  error?: string;
};

const statusOptions = [
  { value: "all", label: "全部" },
  { value: "PENDING", label: "待支付" },
  { value: "PAID", label: "已到账" },
  { value: "CANCELED", label: "已取消" },
  { value: "EXPIRED", label: "已过期" },
];

function formatCurrency(priceCents: number, currency = "CNY") {
  const value = priceCents / 100;
  if (currency === "CNY") {
    return `¥${value.toFixed(2).replace(/\.00$/, "")}`;
  }
  return `${currency} ${value.toFixed(2)}`;
}

function statusLabel(status: string) {
  if (status === "PAID") return "已到账";
  if (status === "CANCELED") return "已取消";
  if (status === "EXPIRED") return "已过期";
  return "待支付";
}

function statusTheme(status: string): "success" | "danger" | "warning" {
  if (status === "PAID") return "success";
  if (status === "CANCELED" || status === "EXPIRED") return "danger";
  return "warning";
}

function emptyForm() {
  return {
    id: "",
    name: "",
    description: "",
    credits: "100",
    bonusCredits: "0",
    priceYuan: "12.9",
    sortOrder: "0",
    isActive: true,
  };
}

type PackageForm = ReturnType<typeof emptyForm>;

export function AdminBillingDashboard({
  initialPackages,
  initialOrders,
  initialPaymentSettings,
}: {
  initialPackages: CreditPackageView[];
  initialOrders: RechargeOrderView[];
  initialPaymentSettings: BillingPaymentSettings;
}) {
  const [packages, setPackages] = useState(initialPackages);
  const [orders, setOrders] = useState(initialOrders);
  const [form, setForm] = useState<PackageForm>(emptyForm());
  const [paymentForm, setPaymentForm] = useState(initialPaymentSettings);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");

  const stats = useMemo(
    () => ({
      packages: packages.length,
      activePackages: packages.filter((pkg) => pkg.isActive).length,
      pendingOrders: orders.filter((order) => order.status === "PENDING").length,
      paidAmount: orders.filter((order) => order.status === "PAID").reduce((sum, order) => sum + order.amountCents, 0),
    }),
    [orders, packages],
  );

  async function requestJson(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const payload = (await response.json().catch(() => ({}))) as BillingPayload;
    if (!response.ok || !payload.ok) throw new Error(payload.error || "操作失败");
    return payload;
  }

  async function savePackage(nextForm = form) {
    setPending("save-package");
    setMessage("");
    try {
      const payload = await requestJson("/api/admin/billing/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: nextForm.id || undefined,
          name: nextForm.name,
          description: nextForm.description,
          credits: Number(nextForm.credits),
          bonusCredits: Number(nextForm.bonusCredits),
          priceYuan: Number(nextForm.priceYuan),
          sortOrder: Number(nextForm.sortOrder),
          isActive: nextForm.isActive,
        }),
      });
      if (payload.package) {
        setPackages((current) => {
          const exists = current.some((pkg) => pkg.id === payload.package!.id);
          if (exists) return current.map((pkg) => (pkg.id === payload.package!.id ? payload.package! : pkg));
          return [...current, payload.package!].sort((a, b) => a.sortOrder - b.sortOrder);
        });
      }
      setForm(emptyForm());
      setMessage("套餐已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存套餐失败");
    } finally {
      setPending("");
    }
  }

  async function savePaymentSettings() {
    setPending("save-payment");
    setMessage("");
    try {
      const payload = await requestJson("/api/admin/billing/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });
      if (payload.settings) setPaymentForm(payload.settings);
      setMessage("支付渠道配置已保存。密钥输入框留空表示不修改原密钥。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存支付配置失败");
    } finally {
      setPending("");
    }
  }

  function editPackage(pkg: CreditPackageView) {
    setForm({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description || "",
      credits: String(pkg.credits),
      bonusCredits: String(pkg.bonusCredits),
      priceYuan: String(pkg.priceCents / 100),
      sortOrder: String(pkg.sortOrder),
      isActive: pkg.isActive,
    });
  }

  async function togglePackage(pkg: CreditPackageView) {
    await savePackage({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description || "",
      credits: String(pkg.credits),
      bonusCredits: String(pkg.bonusCredits),
      priceYuan: String(pkg.priceCents / 100),
      sortOrder: String(pkg.sortOrder),
      isActive: !pkg.isActive,
    });
  }

  async function loadOrders(nextStatus = status, nextQuery = query) {
    setPending("load-orders");
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (nextStatus !== "all") params.set("status", nextStatus);
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      const payload = await requestJson(`/api/admin/billing/orders?${params.toString()}`);
      setOrders(payload.orders || []);
      setMessage("订单列表已刷新。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "刷新订单失败");
    } finally {
      setPending("");
    }
  }

  function patchPayment(path: string, value: string | boolean) {
    const [provider, key] = path.split(".");
    setPaymentForm((current) => ({
      ...current,
      [provider]: {
        ...(current as any)[provider],
        [key]: value,
      },
    }));
  }

  const packageColumns = [
    {
      colKey: "name",
      title: "套餐",
      minWidth: 260,
      cell: ({ row }: { row: CreditPackageView }) => (
        <div>
          <p className="font-black text-slate-900">{row.name}</p>
          <p className="mt-1 text-xs text-slate-500">{row.description || "无描述"}</p>
        </div>
      ),
    },
    { colKey: "totalCredits", title: "总积分", width: 120 },
    {
      colKey: "price",
      title: "价格",
      width: 120,
      cell: ({ row }: { row: CreditPackageView }) => formatCurrency(row.priceCents, row.currency),
    },
    { colKey: "sortOrder", title: "排序", width: 90 },
    {
      colKey: "isActive",
      title: "状态",
      width: 120,
      cell: ({ row }: { row: CreditPackageView }) => <Tag theme={row.isActive ? "success" : "default"} variant="light">{row.isActive ? "已上架" : "已下架"}</Tag>,
    },
    {
      colKey: "action",
      title: "操作",
      width: 180,
      cell: ({ row }: { row: CreditPackageView }) => (
        <Space>
          <Button variant="outline" size="small" onClick={() => editPackage(row)}>编辑</Button>
          <Button theme="primary" size="small" onClick={() => void togglePackage(row)}>{row.isActive ? "下架" : "上架"}</Button>
        </Space>
      ),
    },
  ];

  const orderColumns = [
    {
      colKey: "orderNo",
      title: "订单",
      minWidth: 280,
      cell: ({ row }: { row: RechargeOrderView }) => (
        <div>
          <p className="break-all font-black text-slate-900">{row.orderNo}</p>
          <p className="mt-1 text-xs text-slate-500">{row.userEmail || row.userId}</p>
        </div>
      ),
    },
    {
      colKey: "status",
      title: "状态",
      width: 120,
      cell: ({ row }: { row: RechargeOrderView }) => <Tag theme={statusTheme(row.status)} variant="light">{statusLabel(row.status)}</Tag>,
    },
    {
      colKey: "package",
      title: "套餐",
      minWidth: 220,
      cell: ({ row }: { row: RechargeOrderView }) => <span>{row.packageNameSnapshot} · {row.totalCredits} 积分</span>,
    },
    {
      colKey: "amount",
      title: "金额",
      width: 120,
      cell: ({ row }: { row: RechargeOrderView }) => formatCurrency(row.amountCents, row.currency),
    },
    {
      colKey: "provider",
      title: "渠道",
      width: 130,
      cell: ({ row }: { row: RechargeOrderView }) => <Tag>{row.provider}</Tag>,
    },
    {
      colKey: "createdAt",
      title: "创建时间",
      width: 190,
      cell: ({ row }: { row: RechargeOrderView }) => new Date(row.createdAt).toLocaleString("zh-CN"),
    },
    {
      colKey: "providerTradeNo",
      title: "渠道流水",
      minWidth: 220,
      cell: ({ row }: { row: RechargeOrderView }) => row.providerTradeNo || row.notifyPayloadDigest || "暂无",
    },
  ];

  return (
    <section className="admin-td-grid">
      <div className="admin-td-stat-grid">
        <Card className="admin-td-card"><Statistic title="套餐" value={stats.packages} /></Card>
        <Card className="admin-td-card"><Statistic title="上架" value={stats.activePackages} /></Card>
        <Card className="admin-td-card"><Statistic title="待支付" value={stats.pendingOrders} /></Card>
        <Card className="admin-td-card"><Statistic title="到账金额" value={Number((stats.paidAmount / 100).toFixed(2))} unit="元" /></Card>
      </div>

      {message ? <Alert theme="info" message={message} /> : null}

      <Card className="admin-td-card">
        <Tabs defaultValue="providers">
          <Tabs.TabPanel value="providers" label="支付渠道">
            <div className="grid gap-4 xl:grid-cols-2">
              <PaymentProviderCard
                title="易支付"
                enabled={paymentForm.epay.enabled}
                onEnabledChange={(value) => patchPayment("epay.enabled", value)}
              >
                <SettingInput label="显示名称" value={paymentForm.epay.displayName} onChange={(value) => patchPayment("epay.displayName", value)} />
                <SettingInput label="支付类型" value={paymentForm.epay.defaultType} onChange={(value) => patchPayment("epay.defaultType", value)} placeholder="alipay / wxpay / qqpay" />
                <SettingInput label="网关地址" value={paymentForm.epay.gatewayUrl} onChange={(value) => patchPayment("epay.gatewayUrl", value)} />
                <SettingInput label="商户 PID" value={paymentForm.epay.pid} onChange={(value) => patchPayment("epay.pid", value)} />
                <SettingInput label={`商户 Key${paymentForm.epay.keyConfigured ? "（已配置）" : ""}`} value={paymentForm.epay.key || ""} onChange={(value) => patchPayment("epay.key", value)} placeholder="留空不修改" />
              </PaymentProviderCard>

              <PaymentProviderCard
                title="支付宝当面付"
                enabled={paymentForm.alipayF2f.enabled}
                onEnabledChange={(value) => patchPayment("alipayF2f.enabled", value)}
              >
                <SettingInput label="显示名称" value={paymentForm.alipayF2f.displayName} onChange={(value) => patchPayment("alipayF2f.displayName", value)} />
                <SettingInput label="网关地址" value={paymentForm.alipayF2f.gatewayUrl} onChange={(value) => patchPayment("alipayF2f.gatewayUrl", value)} />
                <SettingInput label="App ID" value={paymentForm.alipayF2f.appId} onChange={(value) => patchPayment("alipayF2f.appId", value)} />
                <SettingInput label={`应用私钥${paymentForm.alipayF2f.privateKeyConfigured ? "（已配置）" : ""}`} value={paymentForm.alipayF2f.privateKey || ""} onChange={(value) => patchPayment("alipayF2f.privateKey", value)} placeholder="留空不修改" textarea />
                <SettingInput label={`支付宝公钥${paymentForm.alipayF2f.alipayPublicKeyConfigured ? "（已配置）" : ""}`} value={paymentForm.alipayF2f.alipayPublicKey || ""} onChange={(value) => patchPayment("alipayF2f.alipayPublicKey", value)} placeholder="留空不修改" textarea />
              </PaymentProviderCard>

              <PaymentProviderCard
                title="微信支付"
                enabled={paymentForm.wechatPay.enabled}
                onEnabledChange={(value) => patchPayment("wechatPay.enabled", value)}
              >
                <SettingInput label="显示名称" value={paymentForm.wechatPay.displayName} onChange={(value) => patchPayment("wechatPay.displayName", value)} />
                <SettingInput label="商户号" value={paymentForm.wechatPay.mchId} onChange={(value) => patchPayment("wechatPay.mchId", value)} />
                <SettingInput label="App ID" value={paymentForm.wechatPay.appId} onChange={(value) => patchPayment("wechatPay.appId", value)} />
                <SettingInput label="证书序列号" value={paymentForm.wechatPay.serialNo} onChange={(value) => patchPayment("wechatPay.serialNo", value)} />
                <SettingInput label={`商户私钥${paymentForm.wechatPay.privateKeyConfigured ? "（已配置）" : ""}`} value={paymentForm.wechatPay.privateKey || ""} onChange={(value) => patchPayment("wechatPay.privateKey", value)} placeholder="留空不修改" textarea />
                <SettingInput label={`APIv3 Key${paymentForm.wechatPay.apiV3KeyConfigured ? "（已配置）" : ""}`} value={paymentForm.wechatPay.apiV3Key || ""} onChange={(value) => patchPayment("wechatPay.apiV3Key", value)} placeholder="留空不修改" />
                <SettingInput label={`平台公钥${paymentForm.wechatPay.platformPublicKeyConfigured ? "（已配置）" : ""}`} value={paymentForm.wechatPay.platformPublicKey || ""} onChange={(value) => patchPayment("wechatPay.platformPublicKey", value)} placeholder="留空不修改" textarea />
              </PaymentProviderCard>

              <PaymentProviderCard
                title="PayPal"
                enabled={paymentForm.paypal.enabled}
                onEnabledChange={(value) => patchPayment("paypal.enabled", value)}
              >
                <SettingInput label="显示名称" value={paymentForm.paypal.displayName} onChange={(value) => patchPayment("paypal.displayName", value)} />
                <Form.FormItem label="模式">
                  <Select value={paymentForm.paypal.mode} options={[{ value: "sandbox", label: "Sandbox" }, { value: "production", label: "Production" }]} onChange={(value) => patchPayment("paypal.mode", String(value))} />
                </Form.FormItem>
                <SettingInput label="Client ID" value={paymentForm.paypal.clientId} onChange={(value) => patchPayment("paypal.clientId", value)} />
                <SettingInput label={`Secret${paymentForm.paypal.secretConfigured ? "（已配置）" : ""}`} value={paymentForm.paypal.secret || ""} onChange={(value) => patchPayment("paypal.secret", value)} placeholder="留空不修改" />
              </PaymentProviderCard>
            </div>
            <Button className="mt-4" theme="primary" loading={pending === "save-payment"} onClick={() => void savePaymentSettings()}>
              保存支付渠道配置
            </Button>
          </Tabs.TabPanel>

          <Tabs.TabPanel value="packages" label="积分套餐">
            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
              <Card bordered title={form.id ? "编辑套餐" : "新增套餐"}>
                <Form labelAlign="top">
                  <SettingInput label="套餐名称" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="入门包" />
                  <SettingInput label="描述" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} placeholder="适合轻量体验" />
                  <Form.FormItem label="基础积分">
                    <InputNumber value={Number(form.credits)} onChange={(value) => setForm((current) => ({ ...current, credits: String(value || 0) }))} />
                  </Form.FormItem>
                  <Form.FormItem label="赠送积分">
                    <InputNumber value={Number(form.bonusCredits)} onChange={(value) => setForm((current) => ({ ...current, bonusCredits: String(value || 0) }))} />
                  </Form.FormItem>
                  <Form.FormItem label="价格（元）">
                    <InputNumber value={Number(form.priceYuan)} decimalPlaces={2} onChange={(value) => setForm((current) => ({ ...current, priceYuan: String(value || 0) }))} />
                  </Form.FormItem>
                  <Form.FormItem label="排序">
                    <InputNumber value={Number(form.sortOrder)} onChange={(value) => setForm((current) => ({ ...current, sortOrder: String(value || 0) }))} />
                  </Form.FormItem>
                  <Form.FormItem label="上架套餐">
                    <Switch value={form.isActive} onChange={(value) => setForm((current) => ({ ...current, isActive: Boolean(value) }))} />
                  </Form.FormItem>
                  <Space>
                    <Button theme="primary" loading={pending === "save-package"} onClick={() => void savePackage()}>保存套餐</Button>
                    <Button variant="outline" onClick={() => setForm(emptyForm())}>清空</Button>
                  </Space>
                </Form>
              </Card>
              <Table rowKey="id" data={packages} columns={packageColumns} hover stripe bordered tableLayout="auto" empty="暂无套餐" />
            </div>
          </Tabs.TabPanel>

          <Tabs.TabPanel value="orders" label="充值订单">
            <Form layout="inline" className="mb-4">
              <Form.FormItem label="状态">
                <Select
                  value={status}
                  options={statusOptions}
                  style={{ width: 160 }}
                  onChange={(value) => {
                    const nextStatus = String(value);
                    setStatus(nextStatus);
                    void loadOrders(nextStatus, query);
                  }}
                />
              </Form.FormItem>
              <Form.FormItem label="搜索">
                <Input value={query} clearable placeholder="订单号、邮箱、套餐、渠道" style={{ width: 340 }} onChange={(value) => setQuery(String(value))} onEnter={() => void loadOrders(status, query)} />
              </Form.FormItem>
              <Form.FormItem>
                <Button theme="primary" loading={pending === "load-orders"} onClick={() => void loadOrders(status, query)}>搜索</Button>
              </Form.FormItem>
            </Form>
            <Table rowKey="id" data={orders} columns={orderColumns} hover stripe bordered tableLayout="auto" empty="暂无订单" />
          </Tabs.TabPanel>
        </Tabs>
      </Card>
    </section>
  );
}

function PaymentProviderCard({
  title,
  enabled,
  onEnabledChange,
  children,
}: {
  title: string;
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Card bordered title={title} headerBordered actions={<Switch value={enabled} onChange={(value) => onEnabledChange(Boolean(value))} />}>
      <Form labelAlign="top">{children}</Form>
    </Card>
  );
}

function SettingInput({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <Form.FormItem label={label}>
      {textarea ? (
        <Textarea value={value} placeholder={placeholder} autosize={{ minRows: 3, maxRows: 6 }} onChange={(nextValue) => onChange(String(nextValue))} />
      ) : (
        <Input value={value} placeholder={placeholder} onChange={(nextValue) => onChange(String(nextValue))} />
      )}
    </Form.FormItem>
  );
}
