-- 对账/诊断查询补充索引：按订单反查积分流水、按第三方交易号关联支付事件。
-- CreateIndex
CREATE INDEX "CreditTransaction_orderId_idx" ON "CreditTransaction"("orderId");

-- CreateIndex
CREATE INDEX "PaymentEvent_providerTradeNo_idx" ON "PaymentEvent"("providerTradeNo");
