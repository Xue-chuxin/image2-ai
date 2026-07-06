import { UserPlus } from "lucide-react";

import { SignInForm } from "@/components/signin-form";

function getSafeNextPath(value: string | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/admin")) {
    return fallback;
  }
  return value;
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const nextPath = getSafeNextPath(resolvedSearchParams.next, "/generate");

  return (
    <section className="w-full max-w-[420px] animate-float-in rounded-2xl border border-line bg-white p-7 shadow-card">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-chip">
        <UserPlus size={20} />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold text-ink">注册账号</h1>
      <p className="mt-1.5 text-sm leading-6 text-ink-secondary">使用邮箱验证码创建账号并设置登录密码，注册成功后自动进入创作页。</p>

      <div className="mt-6">
        <SignInForm nextPath={nextPath} mode="register" />
      </div>
    </section>
  );
}
