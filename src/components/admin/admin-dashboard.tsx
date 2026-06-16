"use client";

import { Card, Progress, Statistic, Table, Tag } from "tdesign-react";
import type { AdminDashboardReport } from "@/lib/admin-dashboard";

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function statusLabel(status: string) {
  if (status === "COMPLETED") return "已完成";
  if (status === "FAILED") return "失败";
  if (status === "CANCELED") return "已取消";
  if (status === "QUEUED") return "排队中";
  if (status === "POLISHING") return "润色中";
  if (status === "GENERATING") return "生成中";
  if (status === "UPLOADING") return "保存中";
  return status;
}

function statusTheme(status: string): "success" | "danger" | "primary" | "default" {
  if (status === "COMPLETED") return "success";
  if (status === "FAILED") return "danger";
  if (["QUEUED", "POLISHING", "GENERATING", "UPLOADING"].includes(status)) return "primary";
  return "default";
}

export function AdminDashboard({ report }: { report: AdminDashboardReport }) {
  const completionTotal = report.jobs.completed + report.jobs.failed + report.jobs.canceled + report.jobs.running;
  const completionRate = completionTotal > 0 ? Math.round((report.jobs.completed / completionTotal) * 100) : 0;

  const recentColumns = [
    {
      colKey: "status",
      title: "状态",
      width: 110,
      cell: ({ row }: { row: AdminDashboardReport["recentJobs"][number] }) => (
        <Tag theme={statusTheme(row.status)} variant="light">
          {statusLabel(row.status)}
        </Tag>
      ),
    },
    {
      colKey: "prompt",
      title: "任务",
      minWidth: 360,
      cell: ({ row }: { row: AdminDashboardReport["recentJobs"][number] }) => (
        <div className="admin-td-cell-stack">
          <p className="admin-td-cell-main admin-td-line-clamp-2">{row.prompt}</p>
          <p className="admin-td-cell-sub admin-td-cell-id">{row.id}</p>
        </div>
      ),
    },
    {
      colKey: "provider",
      title: "Provider",
      width: 190,
      cell: ({ row }: { row: AdminDashboardReport["recentJobs"][number] }) => (
        <div className="admin-td-cell-stack">
          <Tag variant="light">{row.provider}</Tag>
          <p className="admin-td-cell-sub">{row.model || "未记录模型"}</p>
        </div>
      ),
    },
    {
      colKey: "userLabel",
      title: "用户",
      width: 220,
      cell: ({ row }: { row: AdminDashboardReport["recentJobs"][number] }) => <span className="admin-td-cell-id">{row.userLabel}</span>,
    },
    {
      colKey: "createdAt",
      title: "时间",
      width: 190,
      cell: ({ row }: { row: AdminDashboardReport["recentJobs"][number] }) => formatDate(row.createdAt),
    },
  ];

  return (
    <section className="admin-td-grid">
      <div className="admin-dashboard-hero">
        <div>
          <h3>运营总览</h3>
          <p>集中查看用户、任务、作品、积分和充值的核心数据。这里不做复杂操作，负责让你第一眼知道系统是否在正常跑。</p>
        </div>
        <div className="admin-dashboard-meta">
          <Tag theme="primary" variant="light">任务 {report.jobs.total}</Tag>
          <Tag theme="success" variant="light">作品 {report.images.generated}</Tag>
          <Tag theme="warning" variant="light">冻结积分 {report.credits.frozen}</Tag>
        </div>
      </div>

      <div className="admin-dashboard-kpi">
        <Card className="admin-td-card" bordered>
          <Statistic title="用户总数" value={report.users.total} />
          <div className="admin-dashboard-meta">
            <Tag variant="light">普通用户 {report.users.regular}</Tag>
            <Tag theme="primary" variant="light">管理员 {report.users.admins}</Tag>
          </div>
        </Card>
        <Card className="admin-td-card" bordered>
          <Statistic title="任务总数" value={report.jobs.total} />
          <div className="admin-dashboard-meta">
            <Tag theme="primary" variant="light">今日 {report.jobs.today}</Tag>
            <Tag theme="warning" variant="light">进行中 {report.jobs.running}</Tag>
          </div>
        </Card>
        <Card className="admin-td-card" bordered>
          <Statistic title="生成作品" value={report.images.generated} />
          <div className="admin-dashboard-meta">
            <Tag theme="success" variant="light">公开 {report.images.public}</Tag>
            <Tag theme="primary" variant="light">精选 {report.images.curated}</Tag>
          </div>
        </Card>
        <Card className="admin-td-card" bordered>
          <Statistic title="到账金额" value={Number((report.billing.paidAmountCents / 100).toFixed(2))} unit="元" />
          <div className="admin-dashboard-meta">
            <Tag theme="success" variant="light">已付 {report.billing.paidOrders}</Tag>
            <Tag theme="warning" variant="light">待付 {report.billing.pendingOrders}</Tag>
          </div>
        </Card>
      </div>

      <div className="admin-td-two-col-grid">
        <Card className="admin-td-card" bordered title="任务健康度">
          <Progress percentage={completionRate} label={`${completionRate}% 完成`} />
          <div className="admin-dashboard-meta admin-td-form-section">
            <Tag theme="success" variant="light">完成 {report.jobs.completed}</Tag>
            <Tag theme="danger" variant="light">失败 {report.jobs.failed}</Tag>
            <Tag theme="primary" variant="light">进行中 {report.jobs.running}</Tag>
            <Tag variant="light">取消 {report.jobs.canceled}</Tag>
          </div>
        </Card>
        <Card className="admin-td-card" bordered title="积分与素材">
          <div className="admin-dashboard-kpi">
            <Statistic title="可用积分" value={report.credits.available} />
            <Statistic title="冻结积分" value={report.credits.frozen} />
            <Statistic title="参考图" value={report.images.uploads} />
          </div>
        </Card>
      </div>

      <Card className="admin-td-card" bordered title="最近任务">
        <div className="admin-td-table-scroll admin-td-table-scroll--md">
          <Table
            rowKey="id"
            data={report.recentJobs}
            columns={recentColumns}
            hover
            stripe
            tableLayout="fixed"
            tableContentWidth="1280px"
            verticalAlign="top"
            empty="暂无任务记录"
          />
        </div>
      </Card>
    </section>
  );
}
