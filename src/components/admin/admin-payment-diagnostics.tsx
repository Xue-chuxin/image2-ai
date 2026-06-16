"use client";

import { Alert, Button, Card, Space, Table, Tag } from "tdesign-react";
import type { PaymentDiagnosticItem } from "@/lib/payment-diagnostics";

export type AdminPaymentEventView = {
  id: string;
  provider: string;
  eventType: string;
  status: string;
  orderNo: string | null;
  providerTradeNo: string | null;
  message: string | null;
  createdAt: string;
};

function eventStatusTheme(status: string): "success" | "danger" | "warning" | "default" {
  if (status === "VERIFIED") return "success";
  if (status === "FAILED") return "danger";
  if (status === "RECEIVED") return "warning";
  return "default";
}

export function AdminPaymentDiagnostics({
  diagnostics,
  events,
}: {
  diagnostics: PaymentDiagnosticItem[];
  events: AdminPaymentEventView[];
}) {
  const issueCount = diagnostics.reduce((total, item) => total + item.issues.length, 0);

  const diagnosticColumns = [
    {
      colKey: "label",
      title: "渠道",
      width: 160,
      cell: ({ row }: { row: PaymentDiagnosticItem }) => (
        <div>
          <strong>{row.label}</strong>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">{row.provider}</p>
        </div>
      ),
    },
    {
      colKey: "status",
      title: "状态",
      width: 190,
      cell: ({ row }: { row: PaymentDiagnosticItem }) => (
        <Space size="small" breakLine>
          <Tag theme={row.enabled ? "success" : "default"} variant="light">
            {row.enabled ? "已启用" : "未启用"}
          </Tag>
          <Tag theme={row.configured ? "primary" : "warning"} variant="light">
            {row.configured ? "配置完整" : "待配置"}
          </Tag>
        </Space>
      ),
    },
    {
      colKey: "urls",
      title: "联调地址",
      cell: ({ row }: { row: PaymentDiagnosticItem }) => (
        <div className="space-y-1 text-xs text-slate-500">
          <p className="break-all">Notify: {row.notifyUrl}</p>
          <p className="break-all">Return: {row.returnUrl}</p>
        </div>
      ),
    },
    {
      colKey: "issues",
      title: "提示",
      width: 280,
      cell: ({ row }: { row: PaymentDiagnosticItem }) =>
        row.issues.length > 0 ? (
          <Space size="small" breakLine>
            {row.issues.map((issue) => (
              <Tag key={issue} theme="warning" variant="light">
                {issue}
              </Tag>
            ))}
          </Space>
        ) : (
          <Tag theme="success" variant="light">暂无问题</Tag>
        ),
    },
  ];

  const eventColumns = [
    {
      colKey: "status",
      title: "状态",
      width: 130,
      cell: ({ row }: { row: AdminPaymentEventView }) => (
        <Tag theme={eventStatusTheme(row.status)} variant="light">
          {row.status}
        </Tag>
      ),
    },
    {
      colKey: "provider",
      title: "渠道",
      width: 120,
      cell: ({ row }: { row: AdminPaymentEventView }) => <Tag variant="light">{row.provider}</Tag>,
    },
    {
      colKey: "eventType",
      title: "事件",
      width: 150,
      cell: ({ row }: { row: AdminPaymentEventView }) => <span className="font-bold">{row.eventType}</span>,
    },
    {
      colKey: "orderNo",
      title: "订单与流水",
      cell: ({ row }: { row: AdminPaymentEventView }) => (
        <div className="space-y-1 text-xs text-slate-500">
          <p>订单：{row.orderNo || "未识别"}</p>
          <p>渠道流水：{row.providerTradeNo || "暂无"}</p>
          <p>原因：{row.message || "无"}</p>
        </div>
      ),
    },
    {
      colKey: "createdAt",
      title: "时间",
      width: 180,
      cell: ({ row }: { row: AdminPaymentEventView }) => new Date(row.createdAt).toLocaleString("zh-CN"),
    },
  ];

  return (
    <div className="space-y-4">
      {issueCount > 0 ? (
        <Alert theme="warning" title="支付配置存在提示" message={`当前诊断发现 ${issueCount} 条提示，线上联调前请确认回调域名与商户密钥。`} />
      ) : (
        <Alert theme="success" title="支付诊断未发现明显问题" message="支付渠道的启用状态、密钥配置和回调地址已完成基础检查。" />
      )}

      <div className="admin-td-panel-grid">
        <Card
          bordered
          title="支付联调面板"
          headerBordered
          actions={
            <Button href="/api/admin/payments/diagnostics" target="_blank" rel="noreferrer" variant="outline">
              查看 JSON
            </Button>
          }
        >
          <div className="admin-td-table-scroll">
            <Table rowKey="provider" data={diagnostics} columns={diagnosticColumns} hover stripe tableLayout="fixed" />
          </div>
        </Card>

        <Card
          bordered
          title="最近支付事件"
          headerBordered
          actions={
            <Button href="/api/admin/payments/events" target="_blank" rel="noreferrer" variant="outline">
              查看 JSON
            </Button>
          }
        >
          <div className="admin-td-table-scroll">
            <Table
              rowKey="id"
              data={events}
              columns={eventColumns}
              hover
              stripe
              tableLayout="fixed"
              empty="暂无支付事件，完成一次支付回调后会出现在这里。"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
