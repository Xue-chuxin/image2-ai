CREATE TABLE "CuratedGalleryImage" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "fileSize" INTEGER,
  "mimeType" TEXT,
  "ratio" TEXT NOT NULL DEFAULT '1:1',
  "category" TEXT NOT NULL DEFAULT '其他',
  "tags" TEXT NOT NULL DEFAULT '',
  "promptZh" TEXT NOT NULL,
  "promptEn" TEXT,
  "negativePrompt" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'curated',
  "authorName" TEXT NOT NULL DEFAULT '造图台',
  "sourceName" TEXT,
  "sourceUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "takenDownAt" TIMESTAMP(3),
  "takenDownReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CuratedGalleryImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CuratedGalleryImage_isActive_sortOrder_idx" ON "CuratedGalleryImage"("isActive", "sortOrder");
CREATE INDEX "CuratedGalleryImage_category_idx" ON "CuratedGalleryImage"("category");
CREATE INDEX "CuratedGalleryImage_isDeleted_idx" ON "CuratedGalleryImage"("isDeleted");
CREATE INDEX "CuratedGalleryImage_publishedAt_idx" ON "CuratedGalleryImage"("publishedAt");
