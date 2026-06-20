# 常见问题

这份 FAQ 面向自部署用户和二次开发者，优先覆盖部署、Provider、存储、账号和升级时最容易卡住的问题。

## Docker Compose 启动后访问不到页面怎么办？

先确认 `.env.production` 里的 `APP_PORT`，默认访问宿主机的 `http://服务器IP:3000`。如果服务器 3000 端口被占用，可以改成：

```env
APP_PORT="3001"
```

然后重新启动：

```bash
docker compose --env-file .env.production up -d
```

生产环境建议用 Nginx 反向代理到 `http://127.0.0.1:${APP_PORT}`，并开启 HTTPS。

## 已有 PostgreSQL，能不能只启动 Web 服务？

可以。把 `.env.production` 的 `DATABASE_URL` 指向已有数据库，然后使用：

```bash
docker compose --env-file .env.production -f docker-compose.web.yml up -d --build
```

目标数据库需要先创建好，数据库用户需要有建表和执行迁移的权限。

## Docker 里为什么连接不上宿主机 PostgreSQL？

如果 PostgreSQL 跑在 Docker 宿主机本机，可以尝试：

```env
DATABASE_URL="postgresql://db_user:db_password@host.docker.internal:5432/image2_app"
```

同时检查 PostgreSQL 是否允许对应地址访问，以及防火墙和 `pg_hba.conf` 配置。

## 管理员账号在哪里配置？

首次部署时在环境变量中配置：

```env
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="replace-with-a-strong-password"
```

请不要使用示例密码上线。管理员密码、登录密钥、数据库密码都需要使用强随机值。

## `AUTH_SECRET` 和 `SETTINGS_ENCRYPTION_KEY` 应该怎么填？

两者都建议使用至少 32 位随机字符串。它们用于会话签名和后台配置加密，不要使用短密码，不要提交到仓库。

## OpenAI API Key 配在哪里？

推荐在后台配置页保存 API Key，系统会加密入库。也可以通过环境变量提供兜底配置：

```env
OPENAI_API_KEY=""
OPENAI_IMAGE_MODEL="gpt-image-2"
DEFAULT_GENERATION_PROVIDER="openai"
```

Provider 必须由后端统一调用，不要在前端直接请求第三方模型接口。

## DeepSeek 润色不可用怎么办？

确认以下环境变量或后台配置已经设置：

```env
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-chat"
DEEPSEEK_API_KEY=""
```

如果仍失败，请检查服务端日志、API Key 权限、账户余额、网络连通性和中转站兼容性。

## `chatgpt_web` Provider 可以生产使用吗？

不建议。`chatgpt_web` 只作为实验性预留，默认不启用。它依赖本机浏览器登录态，不应该托管用户明文账号密码，也不应该提交 Cookie、Token 或浏览器 Profile。

未配置时，系统应该返回明确的 disabled 错误。

## 生成图片保存在哪里？

当前正式存储实现是 `local`：

```env
STORAGE_PROVIDER="local"
STORAGE_LOCAL_BASE_DIR="public/storage"
STORAGE_GENERATED_PREFIX="generated"
STORAGE_UPLOADS_PREFIX="uploads"
```

Docker Compose 默认把生成图和上传图持久化到：

```text
/app/public/storage/generated
/app/public/storage/uploads
```

如果你修改了本地存储目录或 prefix，需要同步调整自己的 Compose volume 挂载路径。

## 升级前需要备份什么？

至少备份：

- 数据库。
- `.env.production` 或 `.env.local`。
- 图片存储目录。
- 自己二开过但尚未提交的代码。

升级细节见 [UPGRADE.md](../UPGRADE.md)，版本变化见 [CHANGELOG.md](../CHANGELOG.md)。

## 升级后图片不见了怎么办？

先确认当前版本的图片路径是否为 `public/storage/generated` 和 `public/storage/uploads`。旧版本可能使用过不同路径。

项目内置升级脚本会尝试备份和回填旧路径图片：

```bash
bash scripts/update.sh docker
```

如果你自定义过 volume，请根据自己的 Compose 文件检查挂载路径。

## 手机端页面横向溢出或底部导航遮挡怎么办？

请提交 Bug issue，并附带：

- 手机型号或浏览器宽度。
- 页面路径。
- 截图或录屏。
- 复现步骤。

移动端是当前优先验收场景，创作页、后台表格、弹窗、Alert、Radio、Select、Textarea 等组件问题会优先处理。

## 如何反馈安全问题？

请不要公开提交密钥、Cookie、Token、数据库密码、支付密钥或可利用细节。安全问题请按 [SECURITY.md](../SECURITY.md) 私下反馈。
