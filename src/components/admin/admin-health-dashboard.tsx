"use client";

import { Alert, Button, Card, Descriptions, Space, Statistic, Table, Tag } from "tdesign-react";
import type { AdminHealthReport, AdminHealthStatus } from "@/lib/admin-health";

const statusLabel: Record<AdminHealthStatus, string> = {
  ok: "正常",
  warning: "提示",
  error: "异常",
};

function statusTheme(status: AdminHealthStatus): "success" | "warning" | "danger" {
  if (status === "ok") return "success";
  if (status === "error") return "danger";
  return "warning";
}

export function AdminHealthDashboard({ report }: { report: AdminHealthReport }) {
  const summaryItems = [
    { label: "正常项", value: report.summary.ok, theme: "success" as const },
    { label: "提示项", value: report.summary.warning, theme: "warning" as const },
    { label: "异常项", value: report.summary.error, theme: "danger" as const },
  ];

  const healthColumns = [
    {
      colKey: "label",
      title: "检查项",
      width: 190,
      cell: ({ row }: { row: AdminHealthReport["items"][number] }) => <span className="admin-td-cell-main">{row.label}</span>,
    },
    {
      colKey: "status",
      title: "状态",
      width: 110,
      cell: ({ row }: { row: AdminHealthReport["items"][number] }) => (
        <Tag theme={statusTheme(row.status)} variant="light">
          {statusLabel[row.status]}
        </Tag>
      ),
    },
    {
      colKey: "description",
      title: "说明",
      cell: ({ row }: { row: AdminHealthReport["items"][number] }) => (
        <div className="admin-td-cell-stack">
          <p className="admin-td-cell-body">{row.description}</p>
          {row.detail ? <p className="admin-td-cell-sub admin-td-cell-id">{row.detail}</p> : null}
        </div>
      ),
    },
  ];

  const paymentColumns = [
    {
      colKey: "label",
      title: "渠道",
      width: 160,
      cell: ({ row }: { row: AdminHealthReport["paymentDiagnostics"][number] }) => (
        <div className="admin-td-cell-stack">
          <p className="admin-td-cell-main">{row.label}</p>
          <p className="admin-td-cell-code">{row.provider}</p>
        </div>
      ),
    },
    {
      colKey: "state",
      title: "配置状态",
      width: 180,
      cell: ({ row }: { row: AdminHealthReport["paymentDiagnostics"][number] }) => (
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
      colKey: "notifyUrl",
      title: "回调地址",
      cell: ({ row }: { row: AdminHealthReport["paymentDiagnostics"][number] }) => (
        <div className="admin-td-cell-meta">
          <p className="admin-td-cell-id">Notify: {row.notifyUrl}</p>
          <p className="admin-td-cell-id">Return: {row.returnUrl}</p>
        </div>
      ),
    },
    {
      colKey: "issues",
      title: "提示",
      width: 260,
      cell: ({ row }: { row: AdminHealthReport["paymentDiagnostics"][number] }) =>
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

  return (
    <div className="admin-td-grid">
      <div className="admin-td-stat-grid">
        {summaryItems.map((item) => (
          <Card key={item.label} bordered hoverShadow className="admin-td-card">
            <Statistic title={item.label} value={item.value} unit="项" />
            <div className="admin-td-form-section">
              <Tag theme={item.theme} variant="light">{item.label}</Tag>
            </div>
          </Card>
        ))}
      </div>

      {report.summary.error > 0 ? (
        <Alert theme="error" title="存在异常项" message="请优先处理异常配置，再进行线上投放或支付联调。" />
      ) : report.summary.warning > 0 ? (
        <Alert theme="warning" title="存在配置提示" message="系统可以继续运行，但建议根据提示补齐冗余、存储和回调配置。" />
      ) : (
        <Alert theme="success" title="自检正常" message="当前核心运行项未发现异常。" />
      )}

      <Card
        className="admin-td-card"
        bordered
        title="系统检查"
        headerBordered
        actions={
          <Button href="/api/admin/health" target="_blank" rel="noreferrer" variant="outline">
            查看 JSON
          </Button>
        }
      >
        <div className="admin-td-table-scroll">
          <Table
            rowKey="id"
            data={report.items}
            columns={healthColumns}
            hover
            stripe
            tableLayout="fixed"
            tableContentWidth="1180px"
            verticalAlign="top"
          />
        </div>
      </Card>

      <Card className="admin-td-card" bordered title="支付渠道状态" headerBordered>
        <Descriptions layout="vertical" bordered column={3} className="admin-td-descriptions-block">
          <Descriptions.DescriptionsItem label="生成时间">{new Date(report.generatedAt).toLocaleString("zh-CN")}</Descriptions.DescriptionsItem>
          <Descriptions.DescriptionsItem label="启用渠道">{report.paymentDiagnostics.filter((item) => item.enabled).length}</Descriptions.DescriptionsItem>
          <Descriptions.DescriptionsItem label="配置完整">{report.paymentDiagnostics.filter((item) => item.configured).length}</Descriptions.DescriptionsItem>
        </Descriptions>
        <div className="admin-td-table-scroll">
          <Table
            rowKey="provider"
            data={report.paymentDiagnostics}
            columns={paymentColumns}
            hover
            stripe
            tableLayout="fixed"
            tableContentWidth="1180px"
            verticalAlign="top"
          />
        </div>
      </Card>
    </div>
  );
}
