# 阶段 11A：部署与环境标准化

本文档用于把当前 AI 生图系统从本地开发迁移到服务器或 Docker 环境。文档不包含任何真实密钥、Token、Cookie 或数据库密码。

## 1. 当前部署边界

当前项目已经包含：

- Next.js 15 Web 应用
- Prisma + PostgreSQL
- 管理员登录和后台配置
- 用户公开作品 + 运营精选作品流
- 用户登录、积分、充值订单
- OpenAI 官方图像 Provider
- ChatGPT Web 本机浏览器 Provider
- DeepSeek 提示词润色
- 易支付、支付宝当面付、微信支付、PayPal
- 后台支付诊断和上线自检

当前首版上线边界：

- 前台充值只开放易支付。支付宝当面付、微信支付、PayPal 配置仍保留在后台，后续再逐个联调开放。
- 首页和灵感页会优先展示用户公开作品，再补充运营精选作品。
- 运营精选作品在后台 `/admin/images` 维护，也可以通过 `npm run prisma:seed` 使用内置示例初始化。

当前仍未正式完成：

- Redis/BullMQ 队列
- 对象存储 SDK 接入。StorageService 已统一，当前正式实现 local。
- 云服务器托管 ChatGPT Web Cookie

因此第一版生产部署建议使用 `openai` Provider。`chatgpt_web` 更适合本机部署，不建议直接放到普通云服务器无人值守运行。

## 2. 必填环境变量

部署前复制环境模板：

```bash
cp .env.example .env.production
```

必须修改：

```env
DATABASE_URL="postgresql://image2_app:strong-password@postgres:5432/image2_app"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
AUTH_SECRET="replace-with-at-least-32-random-characters"
SETTINGS_ENCRYPTION_KEY="replace-with-at-least-32-random-characters"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="replace-with-a-strong-password"
NEW_USER_INITIAL_CREDITS="100"
```

说明：

- `DATABASE_URL`：生产数据库连接。
- `NEXT_PUBLIC_SITE_URL`：公网访问地址，支付回调和后台上线自检依赖它。
- `AUTH_SECRET`：登录 Cookie 签名密钥，生产环境必须更换。
- `SETTINGS_ENCRYPTION_KEY`：后台保存 API Key 和支付密钥时使用，生产环境必须更换。
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`：首个管理员初始化使用。
- `NEW_USER_INITIAL_CREDITS`：新用户注册送积分。

第三方 API Key 建议在后台配置页保存，系统会加密入库，不建议直接写入仓库文件。

## 3. 本机生产模式

适合 Windows 或 Linux 服务器直接运行 Node.js。

```bash
npm ci
npm run prisma:generate
npm run db:migrate
npm run build
npm run start:prod
```

访问：

```text
http://127.0.0.1:3000
```

如果用于公网，需要用 Nginx 或其他反向代理转发 HTTPS 域名到 `127.0.0.1:3000`。

## 4. Docker Compose 部署

准备 `.env.production` 后执行：

```bash
docker compose up -d --build
```

容器包括：

- `image2-postgres`：PostgreSQL 16
- `image2-web`：Next.js 应用

Web 容器启动时会执行：

```bash
npx prisma migrate deploy
```

本地图片目录挂载为 Docker volume：

```text
image2_generated -> /app/public/generated
image2_uploads -> /app/public/uploads
```

PostgreSQL 数据挂载为：

```text
image2_postgres_data -> /var/lib/postgresql/data
```

查看日志：

```bash
docker compose logs -f web
docker compose logs -f postgres
```

停止：

```bash
docker compose down
```

不要在生产环境执行：

```bash
docker compose down -v
```

该命令会删除数据库 volume。

## 5. Nginx 反向代理

示例文件：

```text
docs/nginx-image2.conf
```

关键要求：

- 使用 HTTPS。
- `proxy_pass` 指向 `http://127.0.0.1:3000`。
- 上传和生成请求建议提高超时时间。
- 支付回调路径必须能从公网访问。

支付平台后台需要填写：

```text
https://your-domain.com/api/payments/notify/epay
https://your-domain.com/api/payments/notify/alipay_f2f
https://your-domain.com/api/payments/notify/wechat_pay
https://your-domain.com/api/payments/return/paypal
```

实际启用哪个渠道就填写哪个渠道。

## 6. 上线自检

部署后登录管理员后台：

```text
/admin/health
```

重点检查：

- 数据库连接是否正常。
- `AUTH_SECRET` 是否不是默认值。
- `SETTINGS_ENCRYPTION_KEY` 是否存在。
- `NEXT_PUBLIC_SITE_URL` 是否是公网域名。
- 支付渠道是否启用且配置完整。
- 支付回调地址是否仍是本地地址。
- `public/generated` 是否可写。

## 7. 支付联调顺序

推荐顺序：

1. 先在后台 `/admin/billing` 配置一个支付渠道。
   首版先启用易支付，前台不会展示其他渠道。
2. 到 `/admin/health` 确认公网回调地址正确。
3. 到用户账户页创建一个小额充值订单。
4. 支付成功后查看 `/admin/billing` 最近支付事件。
5. 确认订单状态变为 `PAID`。
6. 确认用户积分增加。

如果失败，优先看：

- `/admin/billing` 的支付事件。
- 支付平台回调日志。
- Web 容器日志。
- `NEXT_PUBLIC_SITE_URL` 是否与实际域名一致。

## 8. ChatGPT Web Provider 注意事项

`chatgpt_web` Provider 使用本机浏览器持久化登录态，不保存 ChatGPT 账号、密码或 Cookie 到数据库。

生产建议：

- 云服务器优先使用 `openai` Provider。
- `chatgpt_web` 只建议本机部署或内网单机使用。
- 不要把浏览器 Profile 目录提交到 Git。
- 如果要用 Chrome，需要配置 `CHROME_EXECUTABLE_PATH` 或在后台设置 Profile。

## 9. 常用运维命令

数据库迁移：

```bash
npm run db:migrate
```

刷新 Prisma Client：

```bash
npm run prisma:generate
```

Docker 重启 Web：

```bash
docker compose restart web
```

查看容器状态：

```bash
docker compose ps
```

查看最近支付事件：

```text
/admin/billing
```

查看上线自检：

```text
/admin/health
```

初始化运营精选示例：

```bash
npm run prisma:seed
```
