ALTER TABLE "GeneratedImage"
ADD COLUMN "thumbnailUrl" TEXT,
ADD COLUMN "fileSize" INTEGER,
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "takenDownAt" TIMESTAMP(3),
ADD COLUMN "takenDownReason" TEXT;

CREATE INDEX "GeneratedImage_isPublic_createdAt_idx" ON "GeneratedImage"("isPublic", "createdAt");
CREATE INDEX "GeneratedImage_isDeleted_idx" ON "GeneratedImage"("isDeleted");
CREATE INDEX "GeneratedImage_publishedAt_idx" ON "GeneratedImage"("publishedAt");
