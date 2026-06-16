"use client";

import type { ReactNode } from "react";
import { Layout, Menu, Tag } from "tdesign-react";
import {
  CheckCircleIcon,
  CloudUploadIcon,
  ImageIcon,
  MoneyIcon,
  SettingIcon,
  TaskIcon,
  UserIcon,
} from "tdesign-icons-react";

type AdminTabKey = "users" | "jobs" | "images" | "uploads" | "billing" | "health" | "settings";

const { Header, Content, Aside } = Layout;
const { HeadMenu, MenuItem } = Menu;

const adminTabs: Array<{
  key: AdminTabKey;
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  { key: "users", href: "/admin/users", label: "用户", description: "账号与积分", icon: <UserIcon /> },
  { key: "jobs", href: "/admin/jobs", label: "任务", description: "生图队列", icon: <TaskIcon /> },
  { key: "images", href: "/admin/images", label: "作品", description: "公开图库", icon: <ImageIcon /> },
  { key: "uploads", href: "/admin/uploads", label: "上传", description: "参考图", icon: <CloudUploadIcon /> },
  { key: "billing", href: "/admin/billing", label: "支付", description: "套餐与渠道", icon: <MoneyIcon /> },
  { key: "health", href: "/admin/health", label: "自检", description: "上线状态", icon: <CheckCircleIcon /> },
  { key: "settings", href: "/admin/settings", label: "配置", description: "站点与模型", icon: <SettingIcon /> },
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
        <Menu value={active} className="admin-td-menu" theme="light" width="236px" logo={<AdminBrand />}>
          {adminTabs.map((tab) => (
            <MenuItem key={tab.key} value={tab.key} href={tab.href} icon={tab.icon}>
              {tab.label}
            </MenuItem>
          ))}
        </Menu>
      </Aside>
      <Layout>
        <Header className="admin-td-header">
          <div className="admin-td-header-inner">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950">{title}</h2>
              <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">{description}</p>
            </div>
            <Tag className="admin-td-account-tag" theme="primary" variant="light">
              {email || "admin"}
            </Tag>
          </div>
          <HeadMenu value={active} className="admin-td-mobile-menu md:hidden" theme="light">
            {adminTabs.map((tab) => (
              <MenuItem key={tab.key} value={tab.key} href={tab.href}>
                {tab.label}
              </MenuItem>
            ))}
          </HeadMenu>
        </Header>
        <Content className="admin-td-content">{children}</Content>
      </Layout>
    </Layout>
  );
}

function AdminBrand() {
  return (
    <div className="admin-td-brand">
      <div className="admin-td-brand-mark">造</div>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-slate-950">造图台</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">运营管理后台</p>
      </div>
    </div>
  );
}
