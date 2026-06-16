"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, Form, Input, InputNumber, Statistic, Table, Tag } from "tdesign-react";
import type { AdminUserView } from "@/lib/admin-users";

type UsersResponse = {
  ok: boolean;
  users?: AdminUserView[];
  user?: AdminUserView;
  error?: string;
};

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleString("zh-CN") : "暂无";
}

function roleLabel(role: string) {
  return role === "ADMIN" ? "管理员" : "普通用户";
}

async function readResponse(response: Response): Promise<UsersResponse> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as UsersResponse;
  }

  const text = await response.text();
  return {
    ok: false,
    error: text.includes("<!DOCTYPE") ? "接口返回了 HTML 错误页，请查看服务端日志。" : text || "接口返回格式异常。",
  };
}

export function AdminUsersDashboard({ initialUsers }: { initialUsers: AdminUserView[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [amounts, setAmounts] = useState<Record<string, number | undefined>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((user) => user.role === "ADMIN").length,
      availableCredits: users.reduce((sum, user) => sum + user.availableCredits, 0),
      frozenCredits: users.reduce((sum, user) => sum + user.frozenCredits, 0),
    }),
    [users],
  );

  async function refreshUsers(nextQuery = query) {
    setPending("search");
    setMessage("");
    setError("");

    try {
      const params = new URLSearchParams();
      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }
      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await readResponse(response);

      if (!response.ok || !data.ok || !data.users) {
        throw new Error(data.error || "读取用户列表失败。");
      }

      setUsers(data.users);
      setMessage("用户列表已刷新。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "读取用户列表失败。");
    } finally {
      setPending("");
    }
  }

  async function adjustCredits(userId: string) {
    const amount = Number(amounts[userId] || 0);
    const reason = reasons[userId] || "";
    setPending(`credits:${userId}`);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount, reason }),
      });
      const data = await readResponse(response);

      if (!response.ok || !data.ok || !data.user) {
        throw new Error(data.error || "调整积分失败。");
      }

      setUsers((current) => current.map((user) => (user.id === userId ? data.user! : user)));
      setAmounts((current) => ({ ...current, [userId]: undefined }));
      setReasons((current) => ({ ...current, [userId]: "" }));
      setMessage("积分已调整，并已写入积分流水。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "调整积分失败。");
    } finally {
      setPending("");
    }
  }

  const columns = [
    {
      colKey: "identity",
      title: "用户",
      width: 300,
      cell: ({ row }: { row: AdminUserView }) => (
        <div className="admin-td-cell-stack">
          <p className="admin-td-cell-main">{row.email || row.displayName || row.id}</p>
          <p className="admin-td-cell-sub admin-td-cell-id">{row.id}</p>
        </div>
      ),
    },
    {
      colKey: "role",
      title: "角色",
      width: 110,
      cell: ({ row }: { row: AdminUserView }) => (
        <Tag theme={row.role === "ADMIN" ? "warning" : "primary"} variant="light">
          {roleLabel(row.role)}
        </Tag>
      ),
    },
    { colKey: "availableCredits", title: "可用积分", width: 110 },
    { colKey: "frozenCredits", title: "冻结积分", width: 110 },
    { colKey: "generationJobCount", title: "任务", width: 90 },
    { colKey: "rechargeOrderCount", title: "订单", width: 90 },
    {
      colKey: "activity",
      title: "时间",
      width: 240,
      cell: ({ row }: { row: AdminUserView }) => (
        <div className="admin-td-cell-meta">
          <p>注册：{formatTime(row.createdAt)}</p>
          <p>最近登录：{formatTime(row.lastLoginAt)}</p>
        </div>
      ),
    },
    {
      colKey: "creditsAction",
      title: "手动调整积分",
      width: 410,
      cell: ({ row }: { row: AdminUserView }) =>
        row.role !== "USER" ? (
          <Tag theme="warning" variant="light">
            管理员不可调整
          </Tag>
        ) : (
          <div className="admin-user-credit-actions">
            <InputNumber
              value={amounts[row.id]}
              placeholder="100 / -20"
              onChange={(value) => setAmounts((current) => ({ ...current, [row.id]: Number(value || 0) }))}
            />
            <Input
              value={reasons[row.id] || ""}
              placeholder="原因"
              onChange={(value) => setReasons((current) => ({ ...current, [row.id]: String(value) }))}
            />
            <Button theme="primary" loading={pending === `credits:${row.id}`} onClick={() => void adjustCredits(row.id)}>
              确认
            </Button>
          </div>
        ),
    },
  ];

  return (
    <section className="admin-td-grid">
      <div className="admin-td-stat-grid">
        <Card className="admin-td-card">
          <Statistic title="当前列表" value={stats.total} />
        </Card>
        <Card className="admin-td-card">
          <Statistic title="管理员" value={stats.admins} />
        </Card>
        <Card className="admin-td-card">
          <Statistic title="可用积分合计" value={stats.availableCredits} />
        </Card>
        <Card className="admin-td-card">
          <Statistic title="冻结积分合计" value={stats.frozenCredits} />
        </Card>
      </div>

      <Card className="admin-td-card" title="用户运营">
        <Form layout="inline" className="admin-td-filter-form">
          <Form.FormItem label="搜索">
            <Input
              value={query}
              placeholder="邮箱、昵称或用户 ID"
              clearable
              onChange={(value) => setQuery(String(value))}
              onEnter={() => void refreshUsers()}
            />
          </Form.FormItem>
          <Form.FormItem>
            <Button theme="primary" loading={pending === "search"} onClick={() => void refreshUsers()}>
              刷新
            </Button>
          </Form.FormItem>
        </Form>

        {message ? <Alert className="mb-3" theme="success" message={message} /> : null}
        {error ? <Alert className="mb-3" theme="error" message={error} /> : null}

        <div className="admin-td-table-scroll admin-td-table-scroll--lg">
          <Table rowKey="id" data={users} columns={columns} hover stripe bordered tableLayout="fixed" empty="没有找到匹配用户" />
        </div>
      </Card>
    </section>
  );
}
