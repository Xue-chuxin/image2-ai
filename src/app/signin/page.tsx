import { ShieldCheck } from "lucide-react";

import { BlurText, SpotlightCard } from "@/components/front/react-bits";
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
      <SpotlightCard className="p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean-800 text-white shadow-glow">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <BlurText as="h1" text="账号登录" className="mt-5 text-3xl font-black text-slate-950" delay={0.035} />
        <p className="mt-2 text-sm leading-6 text-slate-500">
          普通用户首次登录会自动注册并赠送积分。管理员账号用于进入后台配置站点、Provider 和 DeepSeek 润色提示词。
        </p>
        <SignInForm nextPath={nextPath} initialMode={initialMode} />
      </SpotlightCard>
    </main>
  );
}
