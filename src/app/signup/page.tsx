import { UserPlus } from "lucide-react";

import { BlurText, SpotlightCard } from "@/components/front/react-bits";
import { SignInForm } from "@/components/signin-form";
import { getPublicAppSettings } from "@/lib/settings";

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
  const settings = await getPublicAppSettings();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const nextPath = getSafeNextPath(resolvedSearchParams.next, "/generate");

  if (settings.frontTemplate === "tdesign_workspace") {
    return (
      <main className="front-td-signin-page">
        <section className="td-front-card td-signin-card">
          <div className="td-signin-head">
            <div className="td-signin-icon">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <p>REGISTER</p>
              <h1>注册账号</h1>
              <span>使用邮箱验证码创建普通用户账号，注册成功后直接进入创作工作台。</span>
            </div>
          </div>
          <SignInForm nextPath={nextPath} mode="register" variant="tdesign" />
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md pb-28">
      <SpotlightCard className="p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean-800 text-white shadow-glow">
          <UserPlus className="h-6 w-6" />
        </div>
        <BlurText as="h1" text="注册账号" className="mt-5 text-3xl font-black text-slate-950" delay={0.035} />
        <p className="mt-2 text-sm leading-6 text-slate-500">
          新用户需要先获取邮箱验证码，再设置登录密码。注册成功后会自动进入创作页。
        </p>
        <SignInForm nextPath={nextPath} mode="register" />
      </SpotlightCard>
    </main>
  );
}
