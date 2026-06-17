# Image2 AI 生图系统

Image2 AI 生图系统是一个面向中文用户的 AI 生图 Web 应用，目标是提供类似 image2 的轻量化创作体验。项目内置提示词库、DeepSeek 提示词润色、生图任务、作品历史、积分账户、后台配置和拟 App 风格 WebUI，适合用于学习、二次开发或搭建自己的 AI 图片生成站点。

当前项目默认采用 `openai` 生图 Provider，第三方 API Key 统一通过环境变量或后台加密配置读取，前端不会直接调用模型接口。

## 功能特性

- 中文拟 App 风格首页，包含浅色、蓝白、毛玻璃和液态玻璃视觉风格。
- 首页作品瀑布流展示，支持公开作品和运营精选作品。
- 提示词库，支持分类、标签、详情页、复制提示词和收藏关系。
- DeepSeek 提示词润色 API，可把用户输入优化为更适合生图的提示词。
- 生图工作台，支持比例、质量、数量、参考图上传和任务创建。
- Provider 抽象层，默认接入 OpenAI 官方图像 API。
- `chatgpt_web` Provider 作为实验性预留，未配置时会返回明确的 disabled 错误。
- 用户登录、管理员登录、会话 Cookie 签名和基础权限区分。
- 积分账户、积分流水、生成扣费、订单和充值相关模型。
- 管理后台，包含系统自检、后台配置、用户、任务、图片、上传和账单管理入口。
- StorageService 统一图片保存入口，当前正式实现 `local` 本地存储，并预留 OSS、COS、S3 配置。
- Docker Compose 部署文件，包含 Next.js Web 服务和 PostgreSQL。

## 技术栈

- Next.js 15
- React 19
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
docker compose up -d --build
```

4. 查看日志：

```bash
docker compose logs -f web
docker compose logs -f postgres
```

如果服务器 3000 端口已被占用，把 `.env.production` 里的 `APP_PORT` 改成其他端口，例如：

```env
APP_PORT="3001"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

然后重新启动：

```bash
docker compose up -d
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
docker compose -f docker-compose.web.yml up -d --build
```

4. 查看日志：

```bash
docker compose -f docker-compose.web.yml logs -f web
```

Web 容器启动时会根据 `DATABASE_URL` 自动执行 Prisma 迁移。请先确认目标数据库已创建，并且数据库用户拥有建表和迁移权限。

生产环境建议使用 Nginx 或其他网关反向代理到 `http://127.0.0.1:${APP_PORT}`，并开启 HTTPS。

## 常用脚本

```bash
npm run dev              # 启动开发服务
npm run build            # 构建生产版本
npm run start            # 启动 Next.js 生产服务
npm run start:prod       # 以 0.0.0.0:3000 启动生产服务
npm run db:migrate       # 执行 Prisma 数据库迁移
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:seed      # 初始化示例数据
```

## 重要页面

```text
/                       # 首页作品流
/generate               # 生图工作台
/prompts                # 提示词库
/history                # 生成历史
/account                # 用户账户
/signin                 # 用户登录
/admin                  # 管理后台
/admin/settings         # 后台配置
/admin/health           # 上线自检
```

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

## 安全提醒

- 不要提交 `.env`、`.env.local`、`.env.production`。
- 不要把 OpenAI、DeepSeek、支付平台、数据库、Cookie、Token 或浏览器 Profile 写入仓库。
- `AUTH_SECRET` 和 `SETTINGS_ENCRYPTION_KEY` 生产环境必须替换为高强度随机字符串。
- `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 只用于初始化管理员账号，生产环境必须使用强密码。
- 用户上传图和生成图建议通过 `StorageService` 管理，不要把长期图片二进制直接写入数据库。
- 公开部署前建议访问 `/admin/health` 完成上线自检。

## 生产部署建议

- 第一版生产环境建议使用 `openai` Provider。
- 正式上线前先确认数据库迁移已完成。
- 正式上线前先确认 `NEXT_PUBLIC_SITE_URL` 是公网 HTTPS 域名。
- 图片文件建议后续接入对象存储或 CDN。
- 如果启用支付能力，必须先在测试环境完成回调验签和小额订单联调。
- `chatgpt_web` 不建议放在普通云服务器无人值守运行。

## 开发状态

项目仍在持续迭代中，当前更适合作为中文 AI 生图产品的学习、验证和二次开发基础。支付、对象存储、队列、商业化会员和复杂后台能力请根据自己的上线目标谨慎补齐和联调。

## License

本项目采用 MIT License，详见 `LICENSE`。
