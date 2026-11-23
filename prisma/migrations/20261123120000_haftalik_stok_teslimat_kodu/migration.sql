-- Haftalık stok dosyası: son kaynak fiyatı ve siteden çıkarılan ürünler. Teslimat doğrulama kodu.
ALTER TABLE "Product" ADD COLUMN "sourcePriceKurus" INTEGER;

CREATE TABLE "ExcludedProduct" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExcludedProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExcludedProduct_sku_key" ON "ExcludedProduct"("sku");
CREATE INDEX "ExcludedProduct_barcode_idx" ON "ExcludedProduct"("barcode");

CREATE TABLE "OrderDeliveryCode" (
    "orderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "OrderDeliveryCode_pkey" PRIMARY KEY ("orderId")
);

ALTER TABLE "OrderDeliveryCode" ADD CONSTRAINT "OrderDeliveryCode_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
