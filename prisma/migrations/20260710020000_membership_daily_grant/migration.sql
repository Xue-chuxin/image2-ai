-- 会员每日赠送积分需要记录上次发放时间，避免重复发放
ALTER TABLE "Subscription" ADD COLUMN "lastDailyGrantAt" TIMESTAMP(3);
