-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "orderNo" TEXT,
    "providerTradeNo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "httpMethod" TEXT,
    "requestPath" TEXT,
    "payloadDigest" TEXT,
    "message" TEXT,
    "rawPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentEvent_provider_createdAt_idx" ON "PaymentEvent"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_orderNo_idx" ON "PaymentEvent"("orderNo");

-- CreateIndex
CREATE INDEX "PaymentEvent_status_createdAt_idx" ON "PaymentEvent"("status", "createdAt");
