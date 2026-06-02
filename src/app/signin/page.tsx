import { Mail, ShieldCheck } from "lucide-react";

export default function SignInPage() {
  return (
    <main className="mx-auto max-w-md pb-28">
      <section className="rounded-app border border-ocean-100 bg-white/90 p-6 shadow-app backdrop-blur">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean-800 text-white shadow-glow">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-3xl font-black text-slate-950">登录后开始创作</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">阶段 1 先搭建登录界面，后续接入邮箱或手机号验证码。</p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">邮箱</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-ocean-100 bg-ocean-50/60 px-4 py-3">
              <Mail className="h-4 w-4 text-ocean-700" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="you@example.com" />
            </div>
          </label>
          <button className="w-full rounded-2xl bg-ocean-800 px-4 py-3 text-sm font-black text-white shadow-glow">
            获取验证码
          </button>
        </div>
      </section>
    </main>
  );
}
