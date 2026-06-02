DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GenerationStatus" AS ENUM ('QUEUED', 'POLISHING', 'GENERATING', 'UPLOADING', 'COMPLETED', 'FAILED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CreditTransactionType" AS ENUM ('GRANT', 'FREEZE', 'SPEND', 'REFUND', 'PURCHASE', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  "passwordHash" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PromptCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromptCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Prompt" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "promptZh" TEXT NOT NULL,
  "promptEn" TEXT NOT NULL,
  "negativePrompt" TEXT,
  "coverUrl" TEXT,
  "sourceName" TEXT,
  "sourceUrl" TEXT,
  "authorName" TEXT,
  "licenseNote" TEXT,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "favoriteCount" INTEGER NOT NULL DEFAULT 0,
  "weight" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PromptTag" (
  "id" TEXT NOT NULL,
  "promptId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "PromptTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PromptFavorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "promptId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromptFavorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GenerationJob" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "GenerationStatus" NOT NULL DEFAULT 'QUEUED',
  "originalInput" TEXT NOT NULL,
  "polishedPromptZh" TEXT,
  "polishedPromptEn" TEXT,
  "negativePrompt" TEXT,
  "ratio" TEXT NOT NULL DEFAULT '1:1',
  "quality" TEXT NOT NULL DEFAULT 'standard',
  "imageCount" INTEGER NOT NULL DEFAULT 1,
  "creditCost" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'openai',
  "providerRequestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GeneratedImage" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "seed" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneratedImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CreditAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "available" INTEGER NOT NULL DEFAULT 0,
  "frozen" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CreditTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "CreditTransactionType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "balance" INTEGER NOT NULL,
  "memo" TEXT,
  "jobId" TEXT,
  "orderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AppSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "PromptCategory_slug_key" ON "PromptCategory"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Prompt_slug_key" ON "Prompt"("slug");
CREATE INDEX IF NOT EXISTS "PromptTag_name_idx" ON "PromptTag"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "PromptFavorite_userId_promptId_key" ON "PromptFavorite"("userId", "promptId");
CREATE INDEX IF NOT EXISTS "GenerationJob_userId_createdAt_idx" ON "GenerationJob"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "GenerationJob_status_idx" ON "GenerationJob"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "CreditAccount_userId_key" ON "CreditAccount"("userId");
CREATE INDEX IF NOT EXISTS "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AppSetting_key_key" ON "AppSetting"("key");

DO $$ BEGIN
  ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PromptCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PromptTag" ADD CONSTRAINT "PromptTag_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PromptFavorite" ADD CONSTRAINT "PromptFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PromptFavorite" ADD CONSTRAINT "PromptFavorite_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CreditAccount" ADD CONSTRAINT "CreditAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
