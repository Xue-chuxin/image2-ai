# 贡献指南

感谢你愿意改进 Image2 AI 生图系统。这个项目优先服务中文自部署用户，欢迎围绕部署稳定性、移动端体验、Provider 配置、文档和二开扩展提交贡献。

## 适合贡献的方向

- 修复自部署、Docker、PostgreSQL、Prisma 迁移和图片持久化相关问题。
- 优化移动端布局、TDesign 工作台体验和公开作品展示。
- 补充 Provider、支付、存储、部署、升级相关文档。
- 增加小而清晰的配置项或兼容性修复。
- 提交可复现的 Bug、截图、日志片段和环境信息。

暂不建议在一个 PR 中提交大型支付改造、完整会员体系、队列系统、对象存储 SDK、复杂后台重构或无关视觉重构。此类方向请先开 issue 讨论范围。

## 提交 Issue

提交 Bug 时请尽量包含：

- 当前版本、部署方式和操作系统。
- Node.js、npm、PostgreSQL、Docker / Docker Compose 版本。
- 复现步骤、预期结果和实际结果。
- 浏览器控制台、服务端日志或 Docker 日志中的关键错误。
- 截图或录屏，尤其是移动端布局问题。

请不要在 issue、截图、日志或代码块中粘贴 API Key、Cookie、数据库密码、支付密钥、远程仓库凭证或用户隐私数据。

## 提交 Pull Request

建议流程：

1. Fork 仓库并从最新 `main` 创建分支。
2. 保持改动聚焦，一个 PR 只解决一个明确问题。
3. 优先沿用现有技术栈和代码风格：Next.js、React、TypeScript、Tailwind CSS、TDesign React、Prisma。
4. 面向用户的 UI 文案使用中文，代码、变量名和文件名保持英文。
5. 如果修复 Bug，请同步更新 `CHANGELOG.md` 的“未发布”区。
6. 如果有影响已部署用户的升级步骤，请同步更新 `UPGRADE.md`。
7. 在 PR 描述中说明改动内容、风险点和你做过的验证。

维护者可能会根据变更范围要求补充截图、日志、迁移说明或更小粒度的 PR。

## 本地开发

```bash
npm ci
cp .env.example .env.local
npm run prisma:generate
npm run db:migrate
npm run dev
```

默认访问 `http://127.0.0.1:3000`。如果端口被占用，可以执行：

```bash
npm run dev -- --port 3001
```

## 安全和隐私

- 所有外部 API Key 只能来自环境变量或后台加密配置。
- 上传图、生成图和支付凭证必须走 StorageService。
- 不要提交 `.env.local`、`.env.production`、浏览器 Profile、Cookie、Token 或真实支付密钥。
- 发现安全问题时请按 `SECURITY.md` 私下反馈，不要先公开披露可利用细节。
