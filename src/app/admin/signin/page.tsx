import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { AdminSignInForm } from "@/components/admin/admin-signin-form";
import { getAdminSession } from "@/lib/auth";

function getSafeAdminNextPath(value: string | undefined) {
  const isAdminPath = value === "/admin" || Boolean(value?.startsWith("/admin/"));
  if (!value || !isAdminPath || value.startsWith("//") || value.startsWith("/admin/signin")) {
    return "/admin/settings";
  }
  return value;
}

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const nextPath = getSafeAdminNextPath(resolvedSearchParams.next);
  const session = await getAdminSession();

  if (session) {
    redirect(nextPath);
  }

  return (
    <main className="admin-signin-page">
      <section className="admin-signin-card">
        <div className="admin-signin-brand">
          <span>
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <p>Admin Console</p>
            <h1>管理员登录</h1>
            <small>用于进入后台配置站点、模型通道、作品和运营数据。</small>
          </div>
        </div>
        <AdminSignInForm nextPath={nextPath} />
        <div className="admin-signin-links">
          <Link href="/">返回官网首页</Link>
          <Link href="/signin">用户登录</Link>
        </div>
      </section>
    </main>
  );
}
