import { ShieldCheck } from "lucide-react";

import { SignInForm } from "@/components/signin-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; mode?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialMode = resolvedSearchParams.mode === "admin" ? "admin" : "user";
  const nextPath = resolvedSearchParams.next || (initialMode === "admin" ? "/admin/settings" : "/generate");

  return (
    <main className="mx-auto max-w-md pb-28">
      <section className="rounded-app border border-ocean-100 bg-white/90 p-6 shadow-app backdrop-blur">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean-800 text-white shadow-glow">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-3xl font-black text-slate-950">账号登录</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          普通用户首次登录会自动注册并赠送积分。管理员账号用于进入后台配置站点、Provider 和 DeepSeek 润色提示词。
        </p>
        <SignInForm nextPath={nextPath} initialMode={initialMode} />
      </section>
    </main>
  );
}
