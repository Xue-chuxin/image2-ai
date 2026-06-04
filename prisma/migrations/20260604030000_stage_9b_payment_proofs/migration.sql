ALTER TABLE "RechargeOrder"
  ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'manual_transfer',
  ADD COLUMN "paymentNote" TEXT,
  ADD COLUMN "paymentProofUrl" TEXT,
  ADD COLUMN "paymentProofName" TEXT,
  ADD COLUMN "paymentProofMimeType" TEXT,
  ADD COLUMN "paymentProofSize" INTEGER,
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "adminNote" TEXT;

CREATE INDEX "RechargeOrder_submittedAt_idx" ON "RechargeOrder"("submittedAt");
