-- CreateTable
CREATE TABLE "ImageFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageFavorite_userId_sourceType_imageId_key" ON "ImageFavorite"("userId", "sourceType", "imageId");

-- CreateIndex
CREATE INDEX "ImageFavorite_userId_createdAt_idx" ON "ImageFavorite"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ImageFavorite" ADD CONSTRAINT "ImageFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
