"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, Form, Input, InputNumber, Select, Statistic, Table, Tag } from "tdesign-react";
import type { AdminUserView } from "@/lib/admin-users";

type UsersResponse = {
  ok: boolean;
  users?: AdminUserView[];
  user?: AdminUserView;
  deleted?: {
    id: string;
  };
  error?: string;
};

type EditUserForm = {
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  password: string;
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
  const [editingUser, setEditingUser] = useState<AdminUserView | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({
    email: "",
    displayName: "",
    role: "USER",
    password: "",
  });
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

  function openEditUser(user: AdminUserView) {
    setError("");
    setMessage("");
    setEditingUser(user);
    setEditForm({
      email: user.email || "",
      displayName: user.displayName || "",
      role: user.role === "ADMIN" ? "ADMIN" : "USER",
      password: "",
    });
  }

  async function saveUser() {
    if (!editingUser) return;
    setPending(`edit:${editingUser.id}`);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });
      const data = await readResponse(response);

      if (!response.ok || !data.ok || !data.user) {
        throw new Error(data.error || "编辑用户失败。");
      }

      setUsers((current) => current.map((user) => (user.id === editingUser.id ? data.user! : user)));
      setEditingUser(null);
      setMessage("用户资料已更新。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "编辑用户失败。");
    } finally {
      setPending("");
    }
  }

  async function deleteUser(user: AdminUserView) {
    if (!window.confirm(`确认删除用户 ${user.email || user.displayName || user.id} 吗？相关任务、图片、积分流水和订单也会一并删除。`)) {
      return;
    }

    setPending(`delete:${user.id}`);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await readResponse(response);

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "删除用户失败。");
      }

      setUsers((current) => current.filter((item) => item.id !== user.id));
      setMessage("用户已删除。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "删除用户失败。");
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
      width: 450,
      cell: ({ row }: { row: AdminUserView }) =>
        row.role !== "USER" ? (
          <Tag theme="warning" variant="light">
            管理员不可调整
          </Tag>
        ) : (
          <div className="admin-user-credit-actions">
            <InputNumber
              value={amounts[row.id]}
              placeholder="+100"
              onChange={(value) => setAmounts((current) => ({ ...current, [row.id]: Number(value || 0) }))}
            />
            <Input
              value={reasons[row.id] || ""}
              placeholder="调整原因"
              onChange={(value) => setReasons((current) => ({ ...current, [row.id]: String(value) }))}
            />
            <Button theme="primary" loading={pending === `credits:${row.id}`} onClick={() => void adjustCredits(row.id)}>
              确认
            </Button>
          </div>
        ),
    },
    {
      colKey: "actions",
      title: "操作",
      width: 180,
      fixed: "right" as const,
      cell: ({ row }: { row: AdminUserView }) => (
        <div className="admin-td-action-row">
          <Button size="small" type="button" variant="outline" onClick={() => openEditUser(row)}>
            编辑
          </Button>
          <Button size="small" type="button" theme="danger" variant="outline" loading={pending === `delete:${row.id}`} onClick={() => void deleteUser(row)}>
            删除
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
              className="admin-td-filter-control-md"
              clearable
              onChange={(value) => setQuery(String(value))}
              onEnter={() => void refreshUsers()}
            />
          </Form.FormItem>
          <Form.FormItem>
            <Button type="button" theme="primary" loading={pending === "search"} onClick={() => void refreshUsers()}>
              刷新
            </Button>
          </Form.FormItem>
        </Form>

        {message ? <Alert className="admin-td-form-section" theme="success" message={message} /> : null}
        {error ? <Alert className="admin-td-form-section" theme="error" message={error} /> : null}

        <div className="admin-td-table-scroll admin-td-table-scroll--lg">
          <Table
            rowKey="id"
            data={users}
            columns={columns}
            hover
            stripe
            bordered
            tableLayout="fixed"
            tableContentWidth="1700px"
            verticalAlign="top"
            empty="没有找到匹配用户"
          />
        </div>
      </Card>

      {editingUser ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Edit User</p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">编辑用户</h3>
              <p className="mt-2 text-sm text-slate-500">密码留空表示不修改。管理员账号受保护，不能删除或降级最后一个管理员。</p>
            </div>
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                邮箱
                <Input value={editForm.email} placeholder="user@example.com" onChange={(value) => setEditForm((current) => ({ ...current, email: String(value) }))} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                昵称
                <Input value={editForm.displayName} placeholder="可留空" onChange={(value) => setEditForm((current) => ({ ...current, displayName: String(value) }))} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                角色
                <Select
                  value={editForm.role}
                  options={[
                    { value: "USER", label: "普通用户" },
                    { value: "ADMIN", label: "管理员" },
                  ]}
                  onChange={(value) => setEditForm((current) => ({ ...current, role: String(value) === "ADMIN" ? "ADMIN" : "USER" }))}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                重置密码
                <Input value={editForm.password} type="password" placeholder="留空不修改，填写则至少 6 位" onChange={(value) => setEditForm((current) => ({ ...current, password: String(value) }))} />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                取消
              </Button>
              <Button type="button" theme="primary" loading={pending === `edit:${editingUser.id}`} onClick={() => void saveUser()}>
                保存用户
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
