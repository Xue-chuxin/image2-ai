# 开源质量与传播清单

这份清单用于维护 Image2 AI 生图系统的 GitHub 开源展示、社区协作和版本发布节奏。

## 仓库首页

- README 顶部保持一句话定位、演示站、截图、快速开始和部署入口。
- README 首屏优先回答：项目做什么、适合谁、为什么值得自部署。
- `README_EN.md` 保持英文快速入口，覆盖项目定位、亮点、Docker Compose、本地开发和安全说明。
- `docs/faq.md` 持续沉淀部署、Provider、存储、升级和移动端常见问题。
- 保持 `LICENSE`、`CONTRIBUTING.md`、`SUPPORT.md`、`SECURITY.md`、`CODE_OF_CONDUCT.md` 可见。
- Issue 和 PR 模板保持可用，避免维护者反复追问环境信息。
- `.github/FUNDING.yml` 保持可用，让 GitHub 显示 Sponsor 入口。

## GitHub 仓库设置

建议添加 Topics：

```text
ai-image-generation
image-generation
self-hosted
nextjs
react
typescript
prisma
postgresql
openai
deepseek
docker
tdesign
chinese
webui
```

建议在 GitHub 仓库设置中上传 Social Preview：

```text
public/readme/image2-ai-social-preview.png
```

路径：GitHub 仓库页面 -> Settings -> General -> Social preview。

## Release 发布

每次发布建议检查：

- `CHANGELOG.md` 已整理“未发布”内容到新版本段。
- `package.json` version 与发布版本一致。
- 如有升级影响，`UPGRADE.md` 已更新。
- 可复制 `docs/release-template.md` 中的模板作为 GitHub Release Notes 初稿。
- 已打 tag，例如 `v0.1.4`。
- GitHub Release Notes 说明新增能力、修复点、升级注意事项和已知限制。

Release 标题建议：

```text
Image2 AI v0.1.x - 中文 AI 生图 WebUI 自部署更新
```

## 新手贡献入口

建议长期保留 3 到 6 个 `good first issue`：

- 补充某个部署环境的文档。
- 给 README 增加英文摘要。
- 优化一个移动端页面的截图问题。
- 补充 Provider 配置示例。
- 整理常见部署错误和解决办法。

候选 issue 文案见 `docs/good-first-issues.md`。

## 传播文案

短文案：

```text
我开源了一个可自部署的中文 AI 生图 WebUI：支持提示词库、DeepSeek 润色、OpenAI/兼容接口、生图历史、积分账户、管理后台和 Docker Compose 部署。
GitHub：https://github.com/Xue-chuxin/image2-ai
演示站：https://www.zaotutai.com/
```

标题备选：

```text
开源一个中文 AI 生图 WebUI，可自部署，带提示词库、积分和后台
Image2 AI：面向中文用户的轻量级 AI 生图系统
用 Next.js 做了一个可自部署的 AI 生图站，现已开源
```

优先渠道：

- GitHub Topics 和 Release。
- V2EX、掘金、开源中国、Gitee。
- B 站或视频号录制 1 分钟部署和生成演示。
- 相关 AI 工具、独立开发、Next.js、Docker 社群。

## 日常维护节奏

- 每周处理一轮 issue，优先回复部署和构建问题。
- 每 5 到 10 个用户可感知 Bug 修复提升一次版本号。
- 新功能优先拆成小 issue，避免大型 PR 长期无法合并。
- 对安全、支付、密钥和用户数据相关问题保持谨慎，不在公开渠道暴露细节。
