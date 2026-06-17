# 更新日志

本项目遵循面向开源自部署用户的发布记录。维护者发布新版本时，请把用户需要知道的功能变化、修复、数据库迁移和环境变量变化写在这里。

## 未发布

- 新增 `UPGRADE.md`，说明源码部署、Docker Compose 部署和二开用户的升级流程。
- 新增 `scripts/update.sh`，提供源码部署、完整 Docker Compose、仅 Web Docker Compose 三种常用升级入口。
- 更新 README，补充升级说明、版本发布建议，并修正 Docker Compose 使用 `.env.production` 的命令写法。

## v0.1.0 - 2026-06-17

- 开源第一版，包含中文 AI 生图 WebUI、提示词库、DeepSeek 提示词润色、生图任务、作品历史、积分账户、后台配置和 Docker Compose 部署基础。
- 默认生图 Provider 为 `openai`，通过统一后端接口调用模型能力。
- `chatgpt_web` Provider 仅作为实验性预留，未配置时返回明确的 disabled 错误。
