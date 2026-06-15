# Image2.fun 类 App 风格 AI 生图 WebUI 开发计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个类似 `image2.fun` 的 AI 生图网站，包含提示词库、AI 润色、生图工作台、生成历史、积分系统和拟 App 风格 WebUI。

**Architecture:** 前端采用移动端优先的 App Shell + PWA 结构，后端通过服务层隔离 DeepSeek 润色、OpenAI 图像生成、任务队列、积分扣费和对象存储。生图任务采用异步队列，避免用户请求长时间阻塞，同时为后续多模型、多支付渠道和运营后台预留扩展点。

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, Redis, BullMQ, S3/R2/OSS, DeepSeek API, OpenAI Images/Responses API.

---

## 1. 项目定位

本项目目标是做一个面向中文用户的 AI 生图工具站，核心体验是“找灵感、润色 prompt、生成图片、保存历史”。参考 `image2.fun` 的信息架构，但不照搬视觉和内容。

第一版应优先完成可上线 MVP，而不是一次性做完整商业闭环。推荐先实现提示词库、AI 润色、官方图像 API 生图、用户历史和基础积分，再逐步补充支付、运营后台和更多模型。

## 2. 参考站点功能拆解

`image2.fun` 可以拆成以下模块：

- 提示词库：首页展示精选提示词、分类、搜索、筛选、排序、加载更多。
- 生图工作台：输入 prompt、上传参考图、选择模型、比例、清晰度、生成数量、查看预计耗时和消耗积分。
- 提示词详情页：展示预览图、分类、浏览量、收藏量、完整 prompt、复制按钮、相关提示词。
- 登录与积分：登录注册、试用积分、月卡、永久积分包、不同清晰度扣不同积分。
- 内容运营：提示词来源、作者署名、版权说明、推荐排序、分类维护。

## 3. 关键技术判断

### 3.1 生图接口方案

推荐生产环境使用 OpenAI 官方图像 API 或 Responses API。

原因：

- 官方 Image API 支持文本生图和图片编辑。
- Responses API 更适合多轮图像编辑、参考图上下文和后续聊天式体验。
- 官方 API 有稳定认证、计费、错误码、请求 ID、速率限制信息，便于工程化落地。

不建议把“自动操作网页版 ChatGPT”作为生产后端。

风险：

- 网页结构不稳定，随时会变。
- 需要维护登录态、验证码、cookie、账号风控。
- 不适合多用户商业场景。
- OpenAI 条款限制自动/程序化提取 Output，以及绕过速率限制或保护措施。

可接受的备用方式：

- 提供“复制到 ChatGPT”按钮。
- 提供“打开 ChatGPT 并粘贴 prompt”的用户手动流程。
- 若后续做浏览器插件，只在用户自己的浏览器和账号内执行，不托管用户凭证。

### 3.2 DeepSeek 润色方案

DeepSeek 用于 prompt 润色、翻译、风格增强和结构化参数建议。

建议模型：

- `deepseek-v4-flash`：默认润色，成本更低，速度更快。
- `deepseek-v4-pro`：用于高质量商业 prompt、复杂摄影/海报/角色设定。

建议返回 JSON：

```json
{
  "title": "电影感雨夜街头人像",
  "prompt_zh": "中文优化提示词",
  "prompt_en": "English image generation prompt",
  "negative_prompt": "需要避免的元素",
  "style_tags": ["电影感", "写实", "浅景深"],
  "recommended_ratio": "3:4",
  "quality_hint": "standard"
}
```

## 4. 推荐系统架构

### 4.1 前端

- Next.js App Router。
- React + TypeScript。
- Tailwind CSS + shadcn/ui。
- 移动端优先，桌面端为居中 App 面板 + 右侧预览/历史区域。
- PWA 支持安装到手机桌面。

主要页面：

- `/`：首页，提示词发现 + 快速生图入口。
- `/generate`：生图工作台。
- `/prompts`：提示词库。
- `/prompts/[slug]`：提示词详情。
- `/history`：用户生成历史。
- `/pricing`：积分和套餐。
- `/signin`：登录注册。
- `/admin`：运营后台。

### 4.2 后端

- Next.js Route Handlers 或独立 NestJS/Fastify API。
- Prisma 管理数据库。
- Redis + BullMQ 管理生图队列。
- 对象存储保存上传参考图和生成结果。
- 服务层隔离外部模型接口。

核心服务：

- `PromptPolishService`：调用 DeepSeek。
- `ImageGenerationService`：统一封装图像生成提供商。
- `CreditService`：积分冻结、扣除、回滚。
- `StorageService`：上传、下载、签名 URL。
- `ModerationService`：敏感词和安全策略。
- `PromptImportService`：导入提示词数据。

### 4.3 数据库

建议核心表：

- `users`：用户。
- `auth_codes`：验证码。
- `prompt_categories`：提示词分类。
- `prompts`：提示词主体。
- `prompt_tags`：标签。
- `prompt_favorites`：收藏。
- `generation_jobs`：生图任务。
- `generated_images`：生成图片。
- `credit_accounts`：用户积分余额。
- `credit_transactions`：积分流水。
- `orders`：订单。
- `payments`：支付回调记录。
- `admin_audit_logs`：后台操作日志。

## 5. UI 设计方向

目标是“拟 App 风格 WebUI”，不是传统后台表单。

设计原则：

- 移动端优先，底部 Tab 导航。
- 页面像一个独立 App：固定顶部栏、圆角内容卡片、底部主操作按钮。
- 生图页是核心，应像创作工具，不像普通网页表单。
- 首页强调灵感流和快速开始。
- 结果页强调图片大图预览、多版本对比、再次生成。

推荐视觉：

- 背景：柔和渐变 + 低对比纹理。
- 主色：暖橙、墨绿或蓝灰，不使用默认紫白 AI 工具风。
- 字体：中文使用思源黑体/霞鹜文楷/得意黑等有明确气质的字体方案。
- 动效：页面进入、卡片 stagger、生成进度 breathing，不做过量微动效。

核心组件：

- `AppShell`：顶部栏 + 底部 Tab + 内容容器。
- `PromptCard`：提示词卡片。
- `GenerateComposer`：生图输入面板。
- `ReferenceImageUploader`：参考图上传。
- `GenerationProgressSheet`：生成进度底部弹层。
- `ImageResultGrid`：结果图网格。
- `CreditBadge`：积分展示。
- `PolishModeSelector`：润色模式选择。

## 6. MVP 开发阶段

### 阶段 1：项目骨架

目标：建立可运行的基础项目和页面结构。

任务：

- [ ] 初始化 Next.js + TypeScript 项目。
- [ ] 安装 Tailwind CSS 和 shadcn/ui。
- [ ] 创建 App Shell、底部 Tab、基础布局。
- [ ] 创建首页、生成页、提示词页、历史页、登录页。
- [ ] 配置环境变量模板。
- [ ] 接入 Prisma 和 PostgreSQL。

交付物：

- 可打开的 WebUI。
- 基础路由可访问。
- 数据库连接正常。

### 阶段 2：提示词库

目标：用户可以浏览、搜索、复制和复用提示词。

任务：

- [ ] 设计提示词分类和提示词表结构。
- [ ] 创建种子数据。
- [ ] 实现提示词列表接口。
- [ ] 实现分类筛选、关键词搜索、排序。
- [ ] 实现提示词详情页。
- [ ] 实现复制 prompt 和“一键带入生成页”。
- [ ] 增加来源、作者、授权字段。

交付物：

- 首页可展示提示词卡片。
- 提示词详情页可复制和复用。
- 支持基础搜索筛选。

### 阶段 3：DeepSeek AI 润色

目标：用户输入一句话后，可以自动生成更适合生图的 prompt。

任务：

- [ ] 创建 DeepSeek API 客户端。
- [ ] 实现 `/api/prompts/polish` 接口。
- [ ] 设计系统提示词，要求返回稳定 JSON。
- [ ] 支持润色模式：真实摄影、商品海报、国风角色、UI 概念图、自由创意。
- [ ] 在生成页加入“AI 润色”按钮。
- [ ] 显示中文优化版、英文生图版、负面提示词和推荐比例。

交付物：

- 可以调用 DeepSeek 完成 prompt 润色。
- 前端可以一键采用润色结果。

### 阶段 4：生图任务系统

目标：实现异步生图和结果保存。

任务：

- [ ] 创建生成任务表和生成图片表。
- [ ] 创建 `ImageGenerationService`。
- [ ] 接入 OpenAI 官方图像 API 或 Responses API。
- [ ] 创建 BullMQ 队列。
- [ ] 实现任务创建接口。
- [ ] 实现任务状态查询接口。
- [ ] 实现 Worker 处理生图、上传图片、更新任务状态。
- [ ] 前端显示生成进度。
- [ ] 支持失败提示和重试。

交付物：

- 用户可以提交 prompt 生成图片。
- 图片结果可保存并在历史页查看。
- 任务失败不会阻塞页面。

### 阶段 5：用户与积分

目标：控制使用成本，并为商业化做准备。

任务：

- [ ] 实现邮箱或手机号验证码登录。
- [ ] 新用户赠送体验积分。
- [ ] 创建积分账户和积分流水。
- [ ] 生图前冻结积分。
- [ ] 任务成功扣除积分。
- [ ] 任务失败回滚积分。
- [ ] 前端展示剩余积分和本次消耗。

交付物：

- 登录用户才能生图。
- 积分扣费逻辑可追踪。
- 用户可以查看自己的生成历史。

### 阶段 6：支付和套餐

目标：支持付费购买积分。

任务：

- [ ] 创建套餐配置。
- [ ] 实现价格页。
- [ ] 接入微信支付或支付宝。
- [ ] 实现支付回调。
- [ ] 实现订单状态查询。
- [ ] 支付成功后发放积分。
- [ ] 建立补单和幂等处理。

交付物：

- 用户可以购买积分。
- 支付回调稳定入账。
- 后台可追踪订单和支付记录。

### 阶段 7：运营后台

目标：让运营人员可以维护内容和排查问题。

任务：

- [ ] 创建管理员权限。
- [ ] 提示词增删改查。
- [ ] 分类和标签管理。
- [ ] 首页推荐权重管理。
- [ ] 用户查询。
- [ ] 订单查询。
- [ ] 积分流水查询。
- [ ] 生图任务日志和失败重试。

交付物：

- 运营可维护提示词库。
- 技术可排查生图失败和支付问题。

### 阶段 8：体验和增长

目标：提升留存、SEO 和分享传播。

任务：

- [ ] PWA 安装支持。
- [ ] 图片结果分享页。
- [ ] 提示词详情 SEO。
- [ ] 分类页 SEO。
- [ ] 站点地图。
- [ ] RSS。
- [ ] 每周精选订阅。
- [ ] 图片瀑布流和多版本对比。

交付物：

- 搜索引擎可收录提示词页。
- 用户可以分享生成结果。
- 移动端体验接近 App。

## 7. 第一版推荐范围

第一版建议只做以下内容：

- App 风格首页。
- 提示词库和详情页。
- DeepSeek 润色。
- OpenAI 官方图像 API 生图。
- 用户登录。
- 基础积分。
- 生成历史。
- 简单运营后台。

第一版暂不做：

- 复杂会员体系。
- 多支付渠道。
- 账号池。
- 自动操作 ChatGPT 网页。
- 视频生成。
- 高级团队协作。

## 8. 风险清单

### 8.1 ChatGPT 网页自动化风险

不建议用于生产。应改为官方 API 或用户手动跳转复制。

### 8.2 成本风险

生图成本高，必须做积分冻结、失败回滚、并发限制、每日限额和异常报警。

### 8.3 内容安全风险

需要加入敏感词、违规内容拦截、用户协议和图片审核策略。

### 8.4 版权风险

提示词库必须保留来源、作者和授权信息。用户上传参考图时，需要在协议中声明用户拥有必要权利。

### 8.5 任务可靠性风险

生图是长耗时任务，不能用普通同步请求硬等。必须使用队列、状态轮询/SSE、失败重试和幂等更新。

## 9. 里程碑建议

### 第 1 周

- 完成项目初始化、App Shell、页面骨架、提示词库 MVP。

### 第 2 周

- 完成 DeepSeek 润色、提示词详情、一键带入生成页。

### 第 3 周

- 完成 OpenAI 生图任务队列、对象存储、生成历史。

### 第 4 周

- 完成登录、积分、基础后台和上线准备。

### 第 5 周以后

- 支付、SEO、PWA、分享页、多模型、运营增强。

## 10. 环境变量草案

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/image2fun_clone"
REDIS_URL="redis://localhost:6379"
DEEPSEEK_API_KEY=""
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-v4-flash"
OPENAI_API_KEY=""
OPENAI_IMAGE_MODEL="gpt-image-2"
STORAGE_ENDPOINT=""
STORAGE_BUCKET=""
STORAGE_ACCESS_KEY_ID=""
STORAGE_SECRET_ACCESS_KEY=""
AUTH_SECRET=""
APP_PUBLIC_URL="http://localhost:3000"
```

## 11. 外部参考

- `https://image2.fun/`：参考站首页、提示词库、分类和生成入口。
- `https://image2.fun/generate`：参考站生图工作台。
- `https://image2.fun/pricing`：参考站积分和套餐。
- `https://image2.fun/about`：参考站定位、技术栈和商业模式。
- `https://developers.openai.com/api/docs/guides/image-generation`：OpenAI 图像生成文档。
- `https://openai.com/policies/terms-of-use/`：OpenAI 使用条款。
- `https://api-docs.deepseek.com/`：DeepSeek API 文档。

## 12. 下一步

建议下一步先确认第一版是否采用以下默认方案：

- 生图：OpenAI 官方图像 API。
- 润色：DeepSeek `deepseek-v4-flash`。
- 前端：Next.js + Tailwind + shadcn/ui。
- 数据库：PostgreSQL + Prisma。
- 队列：Redis + BullMQ。
- 存储：Cloudflare R2 或阿里云 OSS。

确认后即可进入项目初始化和 UI 原型阶段。
