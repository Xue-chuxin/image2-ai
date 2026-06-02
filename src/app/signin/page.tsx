import { ShieldCheck } from "lucide-react";
import { AdminSignInForm } from "@/components/admin/admin-signin-form";

export default async function SignInPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <main className="mx-auto max-w-md pb-28">
      <section className="rounded-app border border-ocean-100 bg-white/90 p-6 shadow-app backdrop-blur">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean-800 text-white shadow-glow">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-3xl font-black text-slate-950">管理员登录</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          第一版先使用管理员邮箱密码保护后台。首个管理员可通过 ADMIN_EMAIL 和 ADMIN_PASSWORD 初始化。
        </p>
        <AdminSignInForm nextPath={resolvedSearchParams.next || "/admin/settings"} />
      </section>
    </main>
  );
}
