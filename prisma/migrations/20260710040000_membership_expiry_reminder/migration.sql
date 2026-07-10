-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "expiringRemindedFor" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "expiredRemindedFor" TIMESTAMP(3);
