import { ShieldCheck } from "lucide-react";

import { BlurText, SpotlightCard } from "@/components/front/react-bits";
import { SignInForm } from "@/components/signin-form";
import { getPublicAppSettings } from "@/lib/settings";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; mode?: string }>;
}) {
  const settings = await getPublicAppSettings();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialMode = resolvedSearchParams.mode === "admin" ? "admin" : "user";
  const nextPath = resolvedSearchParams.next || (initialMode === "admin" ? "/admin/settings" : "/generate");

  if (settings.frontTemplate === "tdesign_workspace") {
    return (
      <main className="front-td-signin-page">
        <section className="td-front-card td-signin-card">
          <div className="td-signin-head">
            <div className="td-signin-icon">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p>ACCOUNT</p>
              <h1>账号登录</h1>
              <span>普通用户可登录创作，管理员可进入后台配置站点和模型通道。</span>
            </div>
          </div>
          <SignInForm nextPath={nextPath} initialMode={initialMode} variant="tdesign" />
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md pb-28">
      <SpotlightCard className="p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean-800 text-white shadow-glow">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <BlurText as="h1" text="账号登录" className="mt-5 text-3xl font-black text-slate-950" delay={0.035} />
        <p className="mt-2 text-sm leading-6 text-slate-500">
          已有账号可直接登录，新用户注册需要邮箱验证码。管理员账号用于进入后台配置站点、Provider 和 DeepSeek 润色提示词。
        </p>
        <SignInForm nextPath={nextPath} initialMode={initialMode} />
      </SpotlightCard>
    </main>
  );
}
