# Image2 AI 生图系统

[![License: MIT](https://img.shields.io/github/license/Xue-chuxin/image2-ai?color=1677ff)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Xue-chuxin/image2-ai?style=social)](https://github.com/Xue-chuxin/image2-ai/stargazers)
[![Next.js](https://img.shields.io/badge/Next.js-15-111827)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-1677ff)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed)](docker-compose.yml)

面向中文用户的开源 AI 生图 WebUI，支持提示词库、DeepSeek 提示词润色、OpenAI 官方 / 兼容图像接口、生图历史、积分账户、管理后台和 Docker Compose 自部署。

![Image2 AI 生图系统开源预览](public/readme/image2-ai-github-promo.png)

## 快速入口

- 在线演示：[https://www.zaotutai.com/](https://www.zaotutai.com/)
- English：[README_EN.md](README_EN.md)
- 快速部署：[Docker Compose 部署](#docker-compose-部署)
- 本地开发：[本地开发](#本地开发)
- 常见问题：[docs/faq.md](docs/faq.md)
- 版本记录：[CHANGELOG.md](CHANGELOG.md)
- 升级说明：[UPGRADE.md](UPGRADE.md)
- 贡献指南：[CONTRIBUTING.md](CONTRIBUTING.md)
- 开源发布清单：[docs/open-source-checklist.md](docs/open-source-checklist.md)

## 适合谁

- 想快速搭建中文 AI 生图站点的自部署用户。
- 想学习 Next.js、Prisma、Provider 抽象和 AI 产品后台的开发者。
- 想二开提示词库、积分账户、作品库、支付或模型中转配置的团队。
- 想从一个轻量项目开始验证 AI 图片生成产品形态的独立开发者。

当前项目默认采用 `openai` 生图 Provider，第三方 API Key 统一通过环境变量或后台加密配置读取，前端不会直接调用模型接口。

## 在线演示

演示站地址：[https://www.zaotutai.com/](https://www.zaotutai.com/)

## 30 秒体验 Docker 部署

```bash
cp .env.example .env.production
docker compose --env-file .env.production up -d --build
```

正式启动前请先修改 `.env.production` 中的数据库密码、登录密钥、后台管理员账号、站点地址和模型 API Key。完整说明见 [Docker Compose 部署](#docker-compose-部署)。

## 功能特性

- 浅色蓝白侧边栏应用式前台：画廊广场（推广位 + 应用广场 + 作品瀑布流）、专业绘画创作台、生成历史，移动端底部导航。
- DeepSeek 提示词润色 API，可把用户输入优化为更适合生图的提示词。
- 生图工作台，支持风格方向、比例、质量、数量和任务创建，2 秒轮询任务进度。
- Provider 抽象层，默认接入 OpenAI 官方图像 API，支持多个 OpenAI 兼容中转通道故障转移。
- `chatgpt_web` Provider 作为实验性预留，未配置时会返回明确的 disabled 错误。
- 控制台（基于 Vben Admin 5 / Vue 3 / Ant Design Vue）：用户中心（积分总览、在线充值、订单、流水、账号安全）+ 管理后台（运营概览、系统设置、用户、任务、图片、上传、账单、支付诊断、系统自检），与前台账号 Cookie 互通、按角色出菜单。
- 用户登录、管理员登录、会话 Cookie 签名和基础权限区分。
- 积分账户、积分流水、生成扣费、订单和充值相关模型；易支付 / 支付宝当面付 / 微信支付 / PayPal 四渠道。
- StorageService 统一图片保存入口，当前正式实现 `local` 本地存储，并预留 OSS、COS、S3 配置。
- Docker Compose 部署文件，包含 Next.js Web 服务和 PostgreSQL，控制台静态产物随镜像一起构建。

## 技术栈

- Next.js 15 + React 19（前台与 API）
- Vben Admin 5 + Vue 3 + Ant Design Vue（控制台：用户中心 / 管理后台）
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- DeepSeek API
- OpenAI 图像 API
- Docker / Docker Compose

## 项目结构

```text
.
├── prisma/                 # Prisma schema、迁移和种子数据
├── public/                 # 静态资源和本地存储目录
├── scripts/                # 开发、检查和 ChatGPT Web 辅助脚本
├── src/
│   ├── app/                # Next.js App Router 页面和 API Route
│   ├── components/         # 前台、生成页和后台组件
│   └── lib/                # 业务服务、Provider、鉴权、存储和配置
├── docs/                   # 部署、存储和实验能力说明
├── docker-compose.yml      # Docker Compose 部署配置
├── Dockerfile              # Web 服务镜像
└── .env.example            # 环境变量模板
```

## 环境要求

建议使用：

- Node.js 20 LTS 或更高版本
- npm 10 或更高版本
- PostgreSQL 16
- Docker 和 Docker Compose，可选

## 本地开发

1. 安装依赖：

```bash
npm ci
```

2. 复制环境变量模板：

```bash
cp .env.example .env.local
```

3. 修改 `.env.local`，至少配置：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/image2_app"
AUTH_SECRET="replace-with-at-least-32-random-characters"
SETTINGS_ENCRYPTION_KEY="replace-with-at-least-32-random-characters"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="replace-with-a-strong-password"
```

如需直接使用 OpenAI 官方图像 API，可以配置：

```env
OPENAI_API_KEY=""
OPENAI_IMAGE_MODEL="gpt-image-2"
DEFAULT_GENERATION_PROVIDER="openai"
```

如需使用 DeepSeek 润色能力，可以配置：

```env
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-chat"
DEEPSEEK_API_KEY=""
```

4. 同步数据库：

```bash
npm run prisma:generate
npm run db:migrate
```

5. 可选：初始化示例数据：

```bash
npm run prisma:seed
```

6. 启动开发服务：

```bash
npm run dev
```

默认访问：

```text
http://127.0.0.1:3000
```

如果本机 3000 端口已被占用，可以使用 Next.js 的端口参数启动：

```bash
npm run dev -- --port 3001
```

## Docker Compose 部署

项目提供两种 Docker Compose 部署方式：

- 使用项目自带 PostgreSQL：适合全新服务器或希望数据库一起托管的场景。
- 使用服务器已有 PostgreSQL：适合服务器上已经有 PostgreSQL、RDS 或其他数据库实例的场景。

### 方式一：使用项目自带 PostgreSQL

1. 复制生产环境变量：

```bash
cp .env.example .env.production
```

2. 修改 `.env.production`，至少替换数据库密码、登录密钥、后台管理员账号和站点地址：

```env
POSTGRES_DB="image2_app"
POSTGRES_USER="image2_app"
POSTGRES_PASSWORD="replace-with-a-strong-database-password"
DATABASE_URL="postgresql://image2_app:replace-with-a-strong-database-password@postgres:5432/image2_app"
APP_PORT="3000"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
AUTH_SECRET="replace-with-at-least-32-random-characters"
SETTINGS_ENCRYPTION_KEY="replace-with-at-least-32-random-characters"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="replace-with-a-strong-password"
```

3. 启动服务：

```bash
docker compose --env-file .env.production up -d --build
```

4. 查看日志：

```bash
docker compose --env-file .env.production logs -f web
docker compose --env-file .env.production logs -f postgres
```

如果服务器 3000 端口已被占用，把 `.env.production` 里的 `APP_PORT` 改成其他端口，例如：

```env
APP_PORT="3001"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

然后重新启动：

```bash
docker compose --env-file .env.production up -d
```

此时容器内部仍然使用 3000，宿主机访问端口会变成 `3001`。

主 Compose 文件不会把 PostgreSQL 的 5432 端口暴露到宿主机，所以通常不会和服务器上已有 PostgreSQL 端口冲突。项目也没有固定容器名，避免和同名容器冲突。

### 方式二：使用已有 PostgreSQL

如果服务器已经有 PostgreSQL、RDS 或其他外部数据库，可以只启动 Web 服务：

1. 复制生产环境变量：

```bash
cp .env.example .env.production
```

2. 修改 `.env.production` 的数据库连接，指向已有数据库：

```env
DATABASE_URL="postgresql://db_user:db_password@db_host:5432/image2_app"
APP_PORT="3000"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

如果 PostgreSQL 安装在 Docker 宿主机本机，可以尝试：

```env
DATABASE_URL="postgresql://db_user:db_password@host.docker.internal:5432/image2_app"
```

3. 只启动 Web 服务：

```bash
docker compose --env-file .env.production -f docker-compose.web.yml up -d --build
```

4. 查看日志：

```bash
docker compose --env-file .env.production -f docker-compose.web.yml logs -f web
```

Web 容器启动时会根据 `DATABASE_URL` 自动执行 Prisma 迁移。请先确认目标数据库已创建，并且数据库用户拥有建表和迁移权限。

生产环境建议使用 Nginx 或其他网关反向代理到 `http://127.0.0.1:${APP_PORT}`，并开启 HTTPS。

## 项目更新与升级

自部署用户升级前请先备份数据库、`.env.production` / `.env.local` 和图片存储目录。升级细节见 `UPGRADE.md`，版本变化见 `CHANGELOG.md`。

源码部署常规升级流程：

```bash
git pull --ff-only
npm ci
npm run prisma:generate
npm run db:migrate
npm run build
```

Docker Compose 常规升级流程：

```bash
git pull --ff-only
docker compose --env-file .env.production up -d --build
```

也可以使用项目内置脚本：

```bash
bash scripts/update.sh source      # 源码部署
bash scripts/update.sh docker      # docker-compose.yml
bash scripts/update.sh docker-web  # docker-compose.web.yml
```

升级脚本会在拉取代码前检查工作区是否有未提交改动；如果用户做过本地二开，需要先提交、合并或备份自己的改动。Docker 升级时，如果脚本检测到旧版图片 volume 仍挂载在 `/app/public/generated` 或 `/app/public/uploads`，会先把旧容器里的 `/app/public/storage` 备份到 `.image2-storage-backups/`，重建后再回填到新的 storage volume。可通过 `IMAGE2_STORAGE_BACKUP_DIR=/path/to/backups` 指定备份根目录。


## 常用脚本

```bash
npm run dev              # 启动开发服务
npm run build            # 构建生产版本
npm run start            # 启动 Next.js 生产服务
npm run start:prod       # 以 0.0.0.0:3000 启动生产服务
npm run db:migrate       # 执行 Prisma 数据库迁移
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:seed      # 初始化示例数据
bash scripts/update.sh   # 自部署升级辅助脚本
```

## 重要页面

```text
/                       # 画廊广场（作品流 + 应用广场）
/generate               # 专业绘画（生图工作台）
/history                # 生成历史
/signin                 # 用户登录
/console                # 控制台（用户中心 + 管理后台，统一登录）
/console#/account/...   # 积分总览 / 充值 / 订单 / 流水 / 账号安全
/console#/admin-center/... # 系统设置 / 用户 / 任务 / 图片 / 账单 / 自检等
/account /admin         # 旧地址，自动跳转控制台
```

控制台开发模式：`cd console && pnpm install && pnpm run dev:antd`（端口 5666，/api 自动代理到 Next.js:3000，需 Node >= 22 与 pnpm >= 11）。生产构建：仓库根目录执行 `npm run build:console`，产物输出到 `public/console` 由 Next.js 直接托管。

## Provider 说明

### openai

默认 Provider，适合生产部署。推荐在后台配置页保存 API Key，系统会加密入库；也可以通过环境变量 `OPENAI_API_KEY` 提供兜底配置。

### chatgpt_web

实验性 Provider，仅作为本机或内网实验能力预留。该 Provider 依赖本机浏览器登录态，不应该托管用户明文账号密码，也不应该把 Cookie、Token 或浏览器 Profile 提交到仓库。

未配置时，系统应返回明确的 disabled 错误。

## 存储说明

当前正式实现 `local` 存储：

```env
STORAGE_PROVIDER="local"
STORAGE_LOCAL_BASE_DIR="public/storage"
STORAGE_PUBLIC_BASE_URL=""
STORAGE_GENERATED_PREFIX="generated"
STORAGE_UPLOADS_PREFIX="uploads"
```

生成图、参考图和支付凭证统一通过 `StorageService` 保存。OSS、COS、S3 已预留配置字段，但当前版本尚未接入对应 SDK。

Docker Compose 默认会把生成图和上传图分别持久化到 `/app/public/storage/generated` 和 `/app/public/storage/uploads`。如果你在后台或环境变量里修改了 `STORAGE_LOCAL_BASE_DIR`、`STORAGE_GENERATED_PREFIX` 或 `STORAGE_UPLOADS_PREFIX`，需要同步调整自己的 Compose volume 挂载路径。


## 生产部署建议

- 第一版生产环境建议使用 `openai` Provider。
- 正式上线前先确认数据库迁移已完成。
- 正式上线前先确认 `NEXT_PUBLIC_SITE_URL` 是公网 HTTPS 域名。
- 图片文件建议后续接入对象存储或 CDN。
- `chatgpt_web` 不建议放在普通云服务器无人值守运行。

## 参与开源

欢迎提交 Bug、部署经验、文档补充和小范围功能改进。为了让问题更快被定位，请优先使用仓库内置的 GitHub Issue 模板。

- 贡献流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 使用支持见 [SUPPORT.md](SUPPORT.md)。
- 安全问题见 [SECURITY.md](SECURITY.md)。
- 社区行为准则见 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
- 常见部署问题见 [docs/faq.md](docs/faq.md)。
- 开源质量、Release 和传播清单见 [docs/open-source-checklist.md](docs/open-source-checklist.md)。

如果你想参与但不知道从哪里开始，可以优先关注文档、部署兼容、移动端布局和 Provider 配置说明，这些方向最容易帮助到自部署用户。

## 仓库展示素材

- README 和文章配图：`public/readme/image2-ai-github-promo.png`
- GitHub Social Preview：`public/readme/image2-ai-social-preview.png`

建议在 GitHub 仓库设置中上传 Social Preview 图片，并添加 `ai-image-generation`、`self-hosted`、`nextjs`、`openai`、`deepseek`、`docker`、`tdesign` 等 Topics，提升搜索和分享时的可见度。

## 技术支持与赞助

如果你在部署或使用过程中遇到问题，可以扫码添加技术支持微信反馈 Bug；如果项目对你有帮助，也欢迎通过赞助二维码支持后续维护。

<table>
  <tr>
    <td align="center" width="50%">
      <strong>技术支持 / Bug 反馈</strong><br />
      <img src="public/readme/support-feedback.jpg" alt="技术支持 / Bug 反馈二维码" width="280" />
    </td>
    <td align="center" width="50%">
      <strong>赞助</strong><br />
      <img src="public/readme/sponsor.jpg" alt="赞助二维码" width="280" />
    </td>
  </tr>
</table>

## 开发状态

项目仍在持续迭代中，当前更适合作为中文 AI 生图产品的学习、验证和二次开发基础。支付、对象存储、队列、商业化会员和复杂后台能力请根据自己的上线目标谨慎补齐和联调。

## License

本项目采用 MIT License，详见 `LICENSE`。
