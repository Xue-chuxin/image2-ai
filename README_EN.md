# Image2 AI Image Generation System

[中文文档](README.md) · [Live demo](https://www.zaotutai.com/) · [FAQ](docs/faq.md) · [Contributing](CONTRIBUTING.md)

Image2 AI is an open-source, self-hostable AI image generation WebUI for Chinese users. It includes a prompt library, DeepSeek prompt polishing, OpenAI-compatible image providers, generation history, credit accounting, admin settings, local image storage, and Docker Compose deployment.

![Image2 AI open-source preview](public/readme/image2-ai-github-promo.png)

## Why This Project

- Built for Chinese AI image generation workflows and prompt management.
- Ships with a lightweight product-style WebUI instead of a bare admin panel.
- Supports Docker Compose deployment with PostgreSQL and local persistent storage.
- Keeps third-party API keys on the server side through environment variables or encrypted admin settings.
- Provides a practical foundation for learning, self-hosting, and secondary development.

## Feature Highlights

- Prompt library with categories, tags, detail pages, copy actions, and favorite relationships.
- DeepSeek prompt polishing API for turning rough Chinese ideas into better image prompts.
- Image generation workspace with aspect ratio, quality, quantity, reference image upload, and task creation.
- Provider abstraction with OpenAI official and OpenAI-compatible image channels.
- Experimental `chatgpt_web` provider placeholder, disabled by default when not configured.
- User login, admin login, signed session cookies, and basic permission separation.
- Credit account, credit ledger, generation charge flow, recharge orders, and payment model foundation.
- Admin console for health checks, system settings, users, tasks, images, uploads, and billing.
- StorageService with local storage as the current production implementation.
- Docker Compose files for the web service and PostgreSQL.

## Quick Start With Docker Compose

```bash
cp .env.example .env.production
docker compose --env-file .env.production up -d --build
```

Before production use, update `.env.production` with your database password, authentication secrets, admin account, public site URL, and model API keys.

Required examples:

```env
POSTGRES_DB="image2_app"
POSTGRES_USER="image2_app"
POSTGRES_PASSWORD="replace-with-a-strong-database-password"
DATABASE_URL="postgresql://image2_app:replace-with-a-strong-database-password@postgres:5432/image2_app"
APP_PORT="3000"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
AUTH_SECRET="replace-with-at-least-32-random-characters"
SETTINGS_ENCRYPTION_KEY="replace-with-at-least-32-random-characters"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="replace-with-a-strong-password"
```

For OpenAI official image generation:

```env
OPENAI_API_KEY=""
OPENAI_IMAGE_MODEL="gpt-image-2"
DEFAULT_GENERATION_PROVIDER="openai"
```

For DeepSeek prompt polishing:

```env
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-chat"
DEEPSEEK_API_KEY=""
```

## Local Development

```bash
npm ci
cp .env.example .env.local
npm run prisma:generate
npm run db:migrate
npm run dev
```

The default local URL is:

```text
http://127.0.0.1:3000
```

If port `3000` is already in use:

```bash
npm run dev -- --port 3001
```

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- TDesign React
- Prisma
- PostgreSQL
- DeepSeek API
- OpenAI image API
- Docker / Docker Compose

## Security Notes

- Do not expose API keys in frontend code.
- Store third-party API keys through environment variables or encrypted admin settings.
- Save uploaded images, generated images, and payment proof files through StorageService.
- Do not commit `.env.local`, `.env.production`, cookies, tokens, browser profiles, or real payment secrets.
- Report security issues privately according to [SECURITY.md](SECURITY.md).

## Project Status

The project is actively iterated and currently works best as a Chinese AI image generation product foundation for learning, validation, self-hosting, and secondary development.

Object storage SDKs, queue systems, CDN integration, full membership commercialization, and more advanced operations tooling are future extension areas.

## License

MIT. See [LICENSE](LICENSE).
