CREATE TYPE "RechargeOrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED', 'EXPIRED');

CREATE TABLE "CreditPackage" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "credits" INTEGER NOT NULL,
  "bonusCredits" INTEGER NOT NULL DEFAULT 0,
  "priceCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CNY',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CreditPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RechargeOrder" (
  "id" TEXT NOT NULL,
  "orderNo" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "packageId" TEXT,
  "packageNameSnapshot" TEXT NOT NULL,
  "credits" INTEGER NOT NULL,
  "bonusCredits" INTEGER NOT NULL DEFAULT 0,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CNY',
  "status" "RechargeOrderStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL DEFAULT 'manual',
  "paidAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RechargeOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RechargeOrder_orderNo_key" ON "RechargeOrder"("orderNo");
CREATE INDEX "CreditPackage_isActive_sortOrder_idx" ON "CreditPackage"("isActive", "sortOrder");
CREATE INDEX "RechargeOrder_userId_createdAt_idx" ON "RechargeOrder"("userId", "createdAt");
CREATE INDEX "RechargeOrder_status_createdAt_idx" ON "RechargeOrder"("status", "createdAt");
CREATE INDEX "RechargeOrder_packageId_idx" ON "RechargeOrder"("packageId");

ALTER TABLE "RechargeOrder"
ADD CONSTRAINT "RechargeOrder_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RechargeOrder"
ADD CONSTRAINT "RechargeOrder_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "CreditPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
