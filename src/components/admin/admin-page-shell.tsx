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
const { HeadMenu, MenuGroup, MenuItem } = Menu;

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

const adminMenuGroups = [
  {
    title: "运营管理",
    items: adminTabs.filter((tab) => ["users", "jobs", "images", "uploads"].includes(tab.key)),
  },
  {
    title: "商业与系统",
    items: adminTabs.filter((tab) => ["billing", "health", "settings"].includes(tab.key)),
  },
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
        <Menu
          value={active}
          className="admin-td-menu"
          theme="light"
          width="236px"
          logo={<AdminBrand />}
          operations={<AdminMenuOperations email={email} />}
        >
          {adminMenuGroups.map((group) => (
            <MenuGroup key={group.title} title={group.title}>
              {group.items.map((tab) => (
                <MenuItem key={tab.key} value={tab.key} href={tab.href} icon={tab.icon}>
                  {tab.label}
                </MenuItem>
              ))}
            </MenuGroup>
          ))}
        </Menu>
      </Aside>
      <Layout>
        <Header className="admin-td-header">
          <div className="admin-td-header-inner">
            <div className="admin-td-page-heading">
              <p className="admin-td-page-eyebrow">{eyebrow}</p>
              <h2 className="admin-td-page-title">{title}</h2>
              <p className="admin-td-page-description">{description}</p>
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
      <div className="admin-td-brand-copy">
        <p className="admin-td-brand-title">造图台</p>
        <p className="admin-td-brand-subtitle">运营管理后台</p>
      </div>
    </div>
  );
}

function AdminMenuOperations({ email }: { email?: string | null }) {
  return (
    <div className="admin-td-menu-operations">
      <div className="admin-td-session-status">
        <span className="admin-td-session-dot" />
        <span>已登录</span>
      </div>
      <p className="admin-td-session-label">当前管理员</p>
      <p className="admin-td-session-email">{email || "admin"}</p>
    </div>
  );
}
