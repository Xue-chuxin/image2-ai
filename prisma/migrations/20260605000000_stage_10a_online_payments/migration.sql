ALTER TABLE "RechargeOrder"
  ADD COLUMN "paymentUrl" TEXT,
  ADD COLUMN "qrCodeUrl" TEXT,
  ADD COLUMN "providerTradeNo" TEXT,
  ADD COLUMN "providerPayload" TEXT,
  ADD COLUMN "notifyPayloadDigest" TEXT,
  ADD COLUMN "notifiedAt" TIMESTAMP(3),
  ADD COLUMN "capturedAt" TIMESTAMP(3);

CREATE INDEX "RechargeOrder_provider_idx" ON "RechargeOrder"("provider");
CREATE INDEX "RechargeOrder_providerTradeNo_idx" ON "RechargeOrder"("providerTradeNo");
