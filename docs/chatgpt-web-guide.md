# ChatGPT Web 网页端使用指南

## 工作原理

Image2 使用 Playwright 启动 Chromium 浏览器，自动操控 `chatgpt.com` 网页来生成图片。你的 ChatGPT Plus 订阅可以直接使用，无需额外付费。

```
用户提交生图任务 → Playwright 打开 chatgpt.com → 自动输入提示词 → 点击发送 → 等待 ChatGPT 生成图片 → 提取图片保存
```

---

## 一、首次配置（一次性）

### 1. 启用 ChatGPT Web

编辑 `.env.production`，取消注释：

```bash
CHATGPT_WEB_ENABLED=true
CHATGPT_WEB_HEADLESS=true
CHATGPT_WEB_USER_DATA_DIR=/app/chrome-profile
CHROME_EXECUTABLE_PATH=/usr/bin/chromium
```

或在管理后台 `http://你的域名/admin/settings` → Provider 区域 → 切换并启用。

### 2. 登录 ChatGPT（获取浏览器 Profile）

Linux 服务器没有显示器，需要在你的**本地电脑**上完成登录，然后上传 Profile。

**本地电脑操作：**

```bash
# 1. 进入项目目录
cd image2-app

# 2. 运行登录脚本（会弹出浏览器窗口）
npm run chatgpt:login
```

弹出 Chromium 浏览器后，手动登录你的 ChatGPT 账号。看到对话页面后 `Ctrl+C` 关闭。

脚本会打印 Profile 路径：
```
Profile: C:\Users\你的用户名\image2-app\chatgpt-web-profile    (Windows)
Profile: /Users/你的用户名/image2-app/chatgpt-web-profile       (Mac)
```

**打包上传：**

```bash
# 进入 Profile 所在目录
cd ~/image2-app    # Mac
# 或 cd %USERPROFILE%\image2-app    # Windows

# 打包
tar -czf chatgpt-profile.tar.gz chatgpt-web-profile/

# 上传到服务器
scp chatgpt-profile.tar.gz root@服务器IP:/www/wwwroot/chatgpt/
```

**服务器解压：**

```bash
cd /www/wwwroot/chatgpt
mkdir -p chrome-profile
tar -xzf chatgpt-profile.tar.gz -C chrome-profile/
```

### 3. 重启服务

```bash
docker compose down && docker compose up -d --build
```

---

## 二、验证登录状态

```bash
# 命令行检查
docker compose exec web npx tsx scripts/chatgpt-check.ts
```

或访问管理后台 `http://你的域名/admin/settings` → ChatGPT Web 区域 → 点击「检测状态」。

成功显示：`ChatGPT 已登录，可以生成图片。`

---

## 三、日常使用

### 设置为默认 Provider

管理后台 → Provider → 默认生图 Provider 选 `ChatGPT Web 本机浏览器` → 保存。

### 用户端使用

和普通生图流程一样：
1. 输入中文描述 → 可选 DeepSeek 润色
2. 选择画面比例和质量
3. 点击生成

ChatGPT Web 任务会排队执行（最多同时 2 个）。

---

## 四、常见问题

### Q: 登录过期了怎么办？

ChatGPT session 一般几周到几个月过期。过期后：
1. 本地重新运行 `npm run chatgpt:login` 登录
2. 重新打包上传 Profile
3. 重启服务

### Q: 生成太慢？

ChatGPT Web 流程比 API 慢（需要操控浏览器）。优化方式：
- 减少单次生成张数（1-2 张）
- 选择低质量（`low`）更快
- 已有最多 2 个并发任务

### Q: 生成失败怎么办？

常见原因：
- **登录过期** — 重新登录上传 Profile
- **ChatGPT 网页改版** — DOM 选择器可能失效，检查管理后台诊断信息
- **网络超时** — 系统会自动重试 3 次

### Q: 不想折腾浏览器怎么办？

推荐使用 **Stability AI**：
- 纯 API 调用，不需要浏览器
- 免费额度 25 credits/月
- **原生支持参考图**（img2img）
- 只需配置 `STABILITY_AI_API_KEY=sk-xxx`

---

## 五、环境变量速查

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `CHATGPT_WEB_ENABLED` | 是否启用 | `true` |
| `CHATGPT_WEB_HEADLESS` | 无头模式 | `true`（Linux 必开） |
| `CHATGPT_WEB_USER_DATA_DIR` | Profile 路径 | `/app/chrome-profile` |
| `CHROME_EXECUTABLE_PATH` | Chrome 路径 | `/usr/bin/chromium` |
| `CHATGPT_WEB_TIMEOUT_SECONDS` | 超时秒数 | `180`（默认） |

---

## 六、相关命令

```bash
# 开发机测试：检查登录状态
npm run chatgpt:check

# 开发机：命令行生成图片
npm run chatgpt:generate -- "一只橘猫坐在窗台上，阳光，温暖色调"

# Docker 中直接检查
docker compose exec web npx tsx scripts/chatgpt-check.ts

# Docker 中测试生成
docker compose exec web npx tsx scripts/chatgpt-generate.ts "你的提示词"
```
