import { redirect } from "next/navigation";

// 旧版管理后台已迁移到控制台（vben 应用），保留本路由做兼容跳转。
export default function LegacyAdminPage() {
  redirect("/console");
}
