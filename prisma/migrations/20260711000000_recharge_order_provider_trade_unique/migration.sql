-- 支付唯一约束兜底：同一渠道下的第三方交易号只能对应一笔充值订单，
-- 从数据库层拦截重复回调造成的重复入账。providerTradeNo 为空的订单（尚未支付的 PENDING）
-- 在 Postgres 默认语义下被视为互不相同，因此不受影响。
-- CreateIndex
CREATE UNIQUE INDEX "RechargeOrder_provider_providerTradeNo_key" ON "RechargeOrder"("provider", "providerTradeNo");
