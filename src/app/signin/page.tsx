import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/signin-form";

function getSafeNextPath(value: string | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/admin")) {
    return fallback;
  }
  return value;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; mode?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  if (resolvedSearchParams.mode === "admin") {
    // 管理员登录已并入控制台统一登录页。
    redirect("/console");
  }

  const nextPath = getSafeNextPath(resolvedSearchParams.next, "/generate");

  return (
    <section className="w-full max-w-[420px] animate-float-in rounded-2xl border border-line bg-panel p-7 shadow-card">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-chip">
        <ShieldCheck size={20} />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold text-ink">登录造图台</h1>
      <p className="mt-1.5 text-sm leading-6 text-ink-secondary">使用邮箱账号登录，继续创作、查看生成历史并管理积分。</p>

      <div className="mt-6">
        <SignInForm nextPath={nextPath} mode="login" />
      </div>
    </section>
  );
}
