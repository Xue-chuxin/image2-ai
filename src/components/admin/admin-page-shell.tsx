"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { Layout, Menu } from "tdesign-react";
import {
  CheckCircleIcon,
  CloudUploadIcon,
  CloseIcon,
  DashboardIcon,
  ImageIcon,
  InternetIcon,
  MenuIcon,
  MoneyIcon,
  SettingIcon,
  TaskIcon,
  UserIcon,
} from "tdesign-icons-react";
import { AccountMenu } from "@/components/account-menu";

type AdminTabKey = "dashboard" | "users" | "jobs" | "images" | "uploads" | "billing" | "health" | "settings" | "relays";

const { Header, Content, Aside } = Layout;
const { MenuGroup, MenuItem } = Menu;

const adminTabs: Array<{
  key: AdminTabKey;
  href: string;
  label: string;
  description: string;
  icon: ReactElement;
}> = [
  { key: "dashboard", href: "/admin", label: "仪表盘", description: "运营总览", icon: <DashboardIcon /> },
  { key: "users", href: "/admin/users", label: "用户", description: "账号与积分", icon: <UserIcon /> },
  { key: "jobs", href: "/admin/jobs", label: "任务", description: "生图队列", icon: <TaskIcon /> },
  { key: "images", href: "/admin/images", label: "作品", description: "公开图库", icon: <ImageIcon /> },
  { key: "uploads", href: "/admin/uploads", label: "上传", description: "参考图", icon: <CloudUploadIcon /> },
  { key: "billing", href: "/admin/billing", label: "支付", description: "套餐与渠道", icon: <MoneyIcon /> },
  { key: "health", href: "/admin/health", label: "自检", description: "上线状态", icon: <CheckCircleIcon /> },
  { key: "settings", href: "/admin/settings", label: "配置", description: "站点与模型", icon: <SettingIcon /> },
  { key: "relays", href: "/admin/relays", label: "中转站", description: "推荐入口", icon: <InternetIcon /> },
];

const adminMenuGroups = [
  {
    title: "运营管理",
    items: adminTabs.filter((tab) => ["dashboard", "users", "jobs", "images", "uploads"].includes(tab.key)),
  },
  {
    title: "商业与系统",
    items: adminTabs.filter((tab) => ["billing", "health", "settings"].includes(tab.key)),
  },
  {
    title: "中转站推荐",
    items: adminTabs.filter((tab) => ["relays"].includes(tab.key)),
  },
];

export function AdminPageShell({
  active,
  email,
  title,
  description,
  children,
  wide = false,
}: {
  active: AdminTabKey;
  email?: string | null;
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
            <button
              className="admin-td-mobile-nav-trigger md:hidden"
              type="button"
              aria-label="打开后台导航"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            >
              <MenuIcon />
            </button>
            <div className="admin-td-page-heading">
              <h2 className="admin-td-page-title">{title}</h2>
              <p className="admin-td-page-description">{description}</p>
            </div>
            <div className="admin-td-desktop-account hidden md:block">
              <AccountMenu email={email || "admin"} role="admin" variant="admin" />
            </div>
            <div className="admin-td-mobile-user md:hidden">
              <AccountMenu email={email || "admin"} role="admin" variant="admin" />
            </div>
          </div>
          {mobileNavOpen ? <AdminMobileDrawer active={active} email={email} onClose={() => setMobileNavOpen(false)} /> : null}
        </Header>
        <Content className={wide ? "admin-td-content admin-td-content--wide" : "admin-td-content"}>{children}</Content>
      </Layout>
    </Layout>
  );
}

function AdminMobileDrawer({
  active,
  email,
  onClose,
}: {
  active: AdminTabKey;
  email?: string | null;
  onClose: () => void;
}) {
  return (
    <div className="admin-td-mobile-drawer md:hidden" role="dialog" aria-modal="true" aria-label="后台导航">
      <button className="admin-td-mobile-drawer__backdrop" type="button" aria-label="关闭后台导航" onClick={onClose} />
      <aside className="admin-td-mobile-drawer__panel">
        <div className="admin-td-mobile-drawer__head">
          <AdminBrand />
          <button type="button" aria-label="关闭后台导航" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <nav className="admin-td-mobile-drawer__nav" aria-label="后台菜单">
          {adminMenuGroups.map((group) => (
            <section key={group.title}>
              <p>{group.title}</p>
              <div>
                {group.items.map((tab) => (
                  <a key={tab.key} className={active === tab.key ? "is-active" : ""} href={tab.href} onClick={onClose}>
                    <span className="admin-td-mobile-drawer__icon">{tab.icon}</span>
                    <span>
                      <strong>{tab.label}</strong>
                      <small>{tab.description}</small>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </nav>
        <div className="admin-td-mobile-drawer__session">
          <span>当前管理员</span>
          <strong>{email || "admin"}</strong>
        </div>
      </aside>
    </div>
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
