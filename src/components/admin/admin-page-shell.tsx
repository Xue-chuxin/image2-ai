"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Layout, Menu, Tag } from "tdesign-react";

type AdminTabKey = "users" | "jobs" | "images" | "uploads" | "billing" | "health" | "settings";

const { Header, Content, Aside } = Layout;
const { MenuItem } = Menu;

const adminTabs: Array<{
  key: AdminTabKey;
  href: string;
  label: string;
  description: string;
}> = [
  { key: "users", href: "/admin/users", label: "用户", description: "账号与积分" },
  { key: "jobs", href: "/admin/jobs", label: "任务", description: "生图队列" },
  { key: "images", href: "/admin/images", label: "作品", description: "公开图库" },
  { key: "uploads", href: "/admin/uploads", label: "上传", description: "参考图" },
  { key: "billing", href: "/admin/billing", label: "支付", description: "套餐与渠道" },
  { key: "health", href: "/admin/health", label: "自检", description: "上线状态" },
  { key: "settings", href: "/admin/settings", label: "配置", description: "站点与模型" },
];

export function AdminPageShell({
  active,
  email,
  eyebrow,
  title,
  description,
  children,
}: {
  active: AdminTabKey;
  email?: string | null;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Layout className="admin-td-shell">
      <Aside className="admin-td-sider hidden md:block" width="236px">
        <div className="px-5 py-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
          <h1 className="mt-2 text-xl font-black text-slate-950">运营后台</h1>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">TDesign 管理控制台</p>
        </div>
        <Menu value={active} className="border-0">
          {adminTabs.map((tab) => (
            <MenuItem key={tab.key} value={tab.key}>
              <Link href={tab.href} className="block">
                <span className="block text-sm font-black">{tab.label}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{tab.description}</span>
              </Link>
            </MenuItem>
          ))}
        </Menu>
      </Aside>
      <Layout>
        <Header className="admin-td-header">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2>
              <p className="mt-1 max-w-3xl text-sm font-bold leading-6 text-slate-500">{description}</p>
            </div>
            <Tag theme="primary" variant="light">
              {email || "admin"}
            </Tag>
          </div>
          <div className="flex gap-2 overflow-x-auto px-5 pb-4 md:hidden">
            {adminTabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={`shrink-0 rounded px-3 py-2 text-sm font-black ${tab.key === active ? "bg-slate-950 text-white" : "bg-white text-slate-600"}`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </Header>
        <Content className="admin-td-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
