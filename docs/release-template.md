# GitHub Release 模板

发布新版本时，可以复制下面模板到 GitHub Releases。发布前请先整理 `CHANGELOG.md`，必要时同步更新 `UPGRADE.md` 和 `package.json` version。

## 标题

```text
Image2 AI v0.1.x - 中文 AI 生图 WebUI 自部署更新
```

## 正文模板

```markdown
## 这个版本适合谁

- 正在自部署 Image2 AI 的用户。
- 需要更稳定 Docker / PostgreSQL / 本地图片存储体验的用户。
- 正在基于项目做二次开发的开发者。

## 新增

-

## 修复

-

## 优化

-

## 部署和升级注意事项

- 升级前请备份数据库、`.env.production` / `.env.local` 和图片存储目录。
- 如果使用 Docker Compose，请确认 volume 路径与 `STORAGE_LOCAL_BASE_DIR`、`STORAGE_GENERATED_PREFIX`、`STORAGE_UPLOADS_PREFIX` 保持一致。
- 如果本版本包含数据库迁移，请确认数据库用户拥有迁移权限。

## 自部署升级命令

源码部署：

```bash
git pull --ff-only
npm ci
npm run prisma:generate
npm run db:migrate
npm run build
```

Docker Compose：

```bash
git pull --ff-only
docker compose --env-file .env.production up -d --build
```

也可以使用项目内置脚本：

```bash
bash scripts/update.sh source
bash scripts/update.sh docker
bash scripts/update.sh docker-web
```

## 已知限制

- 当前正式存储实现是 local StorageService；OSS、COS、S3、CDN 仍属于后续扩展方向。
- `chatgpt_web` Provider 仅作为实验性预留，不建议生产无人值守使用。
- 更完整的会员商业化、队列系统和复杂运营后台仍属于后续规划。
```

## 发布前检查

- `CHANGELOG.md` 已从“未发布”整理到目标版本段。
- `package.json` version 已按需更新。
- 如有破坏性变更或升级步骤，`UPGRADE.md` 已更新。
- Git tag 与 Release 版本号一致。
- Release Notes 没有包含 API Key、Cookie、Token、数据库密码、支付密钥或用户隐私。
