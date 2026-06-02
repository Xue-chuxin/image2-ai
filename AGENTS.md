# AGENTS.md

## 项目说明

这是一个类似 image2.fun 的中文 AI 生图 Web 应用，核心能力包括提示词库、DeepSeek 提示词润色、生图任务、作品历史、积分系统和拟 App 风格 WebUI。

## 技术栈

Next.js 15、React 19、TypeScript、Tailwind CSS、Prisma、PostgreSQL、DeepSeek API、OpenAI 图像 API。后续可接 Redis、BullMQ、对象存储和支付系统。

## 工作规则

默认使用中文沟通。代码、变量名和文件名保持英文，面向用户的 UI 文案使用中文。

修改前先确认当前阶段和目标，不要越级实现支付、完整会员、复杂后台或无关重构。

除非用户明确要求，不要运行测试、构建、格式化或额外验证命令。

不要使用破坏性 Git 命令，例如 git reset --hard、git checkout --、强制推送。

每次完成用户要求的代码改动后，必须使用中文 commit message 提交并推送当前分支。

不要在回复、日志、提交信息或代码中泄露 token、cookie、API key、数据库密码或远程仓库鉴权信息。

## 当前开发进度

阶段 1 项目骨架已完成。阶段 2 提示词库和首页瀑布流交互已完成第一版。阶段 3 DeepSeek 提示词润色 API 已完成第一版。

下一阶段优先做阶段 4A：后台配置、管理员权限、生图任务创建、Provider 抽象、OpenAI 官方图像 Provider、任务状态查询、历史结果落库。

## 生图 Provider 策略

默认 Provider 是 openai，使用官方 API，适合生产上线。

chatgpt_web Provider 只作为实验性预留，不默认启用，不在仓库保存账号、cookie 或 token。未配置时必须返回明确的 disabled 错误。

Provider 必须通过统一接口调用，不允许前端直接调用第三方模型接口。

## UI 约束

整体保持浅色、蓝白、拟 App、毛玻璃和液态玻璃风格。

避免紫粉渐变、过重 AI 工具感、emoji 堆砌和传统后台表格风。

首页作品展示保持瀑布流，详情弹窗显示在当前屏幕居中位置。

## 安全约束

所有外部 API Key 只能从环境变量或加密后的后台配置读取。

用户上传图和生成图后续必须走 StorageService，不要把长期图片数据直接写进数据库。

ChatGPT 网页自动化不得托管用户明文账号密码。
