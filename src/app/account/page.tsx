import { redirect } from "next/navigation";

// 用户中心已迁移到控制台（vben 应用），本路由保留作为兼容跳转。
export default function AccountPage() {
  redirect("/console#/account/overview");
}
