-- Kartla ödeme (PayTR): ödeme bekleyen sipariş durumu ve siparişin geldiği sepet.
ALTER TYPE "OrderStatus" ADD VALUE 'AWAITING_PAYMENT' BEFORE 'PENDING';

ALTER TABLE "Order" ADD COLUMN "cartId" TEXT;

CREATE INDEX "Order_cartId_idx" ON "Order"("cartId");
