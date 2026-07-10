import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { ProfileEditor } from "@/components/profile-editor";
import { getUserSession } from "@/lib/auth";
import { getUserProfile, type UserProfileView } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getUserSession();

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-[1200px] space-y-5">
        <div className="flex justify-center py-10 md:py-16">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <LockKeyhole className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-lg font-bold text-ink">请先登录</h1>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">登录后可以设置昵称与头像，头像会显示在你的评论与账户菜单中。</p>
            <Link
              href="/signin?next=/profile"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
            >
              去登录
            </Link>
          </div>
        </div>
      </main>
    );
  }

  let profile: UserProfileView = { email: session.email, displayName: null, avatarUrl: null };
  try {
    profile = await getUserProfile(session.userId);
  } catch {
    // 数据库暂不可用时用会话邮箱兜底渲染。
  }

  return (
    <main className="mx-auto w-full max-w-[720px] space-y-5">
      <section className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">账户</p>
        <h1 className="text-xl font-bold text-ink">个人资料</h1>
        <p className="text-sm leading-6 text-ink-secondary">设置你的昵称和头像。头像会显示在账户菜单和画廊评论中。</p>
      </section>
      <ProfileEditor initialProfile={profile} />
    </main>
  );
}
