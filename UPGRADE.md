# 升级指南

这份文档面向已经自行部署 Image2 AI 生图系统的用户。升级前请先备份数据库、`.env.production` / `.env.local` 和图片存储目录或 Docker volume。

## 升级前检查

- 确认当前项目目录是通过 Git 克隆的仓库。
- 确认本地没有未提交的二开改动：`git status --short`。
- 备份 PostgreSQL 数据库。
- 备份本地图片目录，默认是 `public/storage`，Docker 部署则通常是 Compose volume。
- 查看 `CHANGELOG.md`，确认是否有新的环境变量、数据库迁移或破坏性变更。

## 源码部署升级

适合使用 Node.js、PM2、systemd 或面板直接运行项目的部署方式。

```bash
git pull --ff-only
npm ci
npm run prisma:generate
npm run db:migrate
npm run build
```

然后按自己的进程管理方式重启服务，例如：

```bash
pm2 restart image2-ai
```

如果你的生产环境变量文件不是当前 shell 已加载的环境变量，可以使用升级脚本：

```bash
IMAGE2_ENV_FILE=.env.production bash scripts/update.sh source
```

脚本会加载指定 env 文件，但不会打印任何密钥内容。

## Docker Compose 升级

### 使用项目自带 PostgreSQL

```bash
git pull --ff-only
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production logs -f web
```

Web 容器启动时会执行 `prisma migrate deploy`。如果迁移失败，先不要反复重启容器，应该查看日志并恢复数据库备份或修复配置。

也可以使用脚本：

```bash
bash scripts/update.sh docker
```

### 使用已有 PostgreSQL，仅启动 Web

```bash
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.web.yml up -d --build
docker compose --env-file .env.production -f docker-compose.web.yml logs -f web
```

也可以使用脚本：

```bash
bash scripts/update.sh docker-web
```

## 环境变量变更

每次升级后建议对比 `.env.example` 和自己的 `.env.production` / `.env.local`：

```bash
diff -u .env.example .env.production
```

不要直接覆盖自己的生产环境变量文件。新增变量应手动复制并填写，API Key、数据库密码、Cookie、Token 等敏感信息不要提交到仓库。

## 有本地二开时如何升级

如果你修改过代码，推荐把自己的项目作为 fork 维护，然后把官方仓库作为 `upstream`：

```bash
git remote add upstream git@github.com:Xue-chuxin/image2-ai.git
git fetch upstream
git merge upstream/main
```

出现冲突时，优先保留自己的部署配置和密钥，按业务代码差异逐个解决。不要使用 `git reset --hard` 直接覆盖本地二开。

## 回滚建议

回滚前先确认是否已经执行过新的数据库迁移。代码可以切回旧版本，但数据库结构不一定能自动回退。

源码部署可以切换到旧 tag 后重新安装和构建：

```bash
git checkout v0.1.0
npm ci
npm run prisma:generate
npm run build
```

Docker 部署可以切换到旧 tag 后重新构建：

```bash
git checkout v0.1.0
docker compose --env-file .env.production up -d --build
```

如果数据库迁移已经造成不兼容，请优先从升级前的数据库备份恢复。
