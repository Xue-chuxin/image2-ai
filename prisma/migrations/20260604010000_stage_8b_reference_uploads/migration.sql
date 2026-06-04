CREATE TABLE "UploadedImage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "purpose" TEXT NOT NULL DEFAULT 'reference',
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UploadedImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GenerationJobReferenceImage" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "imageId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GenerationJobReferenceImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UploadedImage_userId_createdAt_idx" ON "UploadedImage"("userId", "createdAt");
CREATE INDEX "UploadedImage_purpose_idx" ON "UploadedImage"("purpose");
CREATE INDEX "UploadedImage_isDeleted_idx" ON "UploadedImage"("isDeleted");
CREATE UNIQUE INDEX "GenerationJobReferenceImage_jobId_imageId_key" ON "GenerationJobReferenceImage"("jobId", "imageId");
CREATE INDEX "GenerationJobReferenceImage_jobId_sortOrder_idx" ON "GenerationJobReferenceImage"("jobId", "sortOrder");
CREATE INDEX "GenerationJobReferenceImage_imageId_idx" ON "GenerationJobReferenceImage"("imageId");

ALTER TABLE "UploadedImage"
ADD CONSTRAINT "UploadedImage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GenerationJobReferenceImage"
ADD CONSTRAINT "GenerationJobReferenceImage_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GenerationJobReferenceImage"
ADD CONSTRAINT "GenerationJobReferenceImage_imageId_fkey"
FOREIGN KEY ("imageId") REFERENCES "UploadedImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
