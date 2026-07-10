-- CreateTable
CREATE TABLE "GalleryImageLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryImageLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryImageComment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryImageComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryImageLike_sourceType_imageId_idx" ON "GalleryImageLike"("sourceType", "imageId");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryImageLike_userId_sourceType_imageId_key" ON "GalleryImageLike"("userId", "sourceType", "imageId");

-- CreateIndex
CREATE INDEX "GalleryImageComment_sourceType_imageId_createdAt_idx" ON "GalleryImageComment"("sourceType", "imageId", "createdAt");

-- CreateIndex
CREATE INDEX "GalleryImageComment_userId_createdAt_idx" ON "GalleryImageComment"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "GalleryImageLike" ADD CONSTRAINT "GalleryImageLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryImageComment" ADD CONSTRAINT "GalleryImageComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
