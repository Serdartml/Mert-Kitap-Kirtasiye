-- Arama için trigram eklentisi (Neon'da desteklenir).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Ürün araması: name / description / sku üzerinde ILIKE '%...%' sorguları.
CREATE INDEX "Product_name_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Product_description_idx" ON "Product" USING GIN ("description" gin_trgm_ops);
CREATE INDEX "Product_sku_idx" ON "Product" USING GIN ("sku" gin_trgm_ops);

-- Vitrin/kategori listeleri: aktif ürünler, yeniden eskiye.
CREATE INDEX "Product_isActive_createdAt_idx" ON "Product"("isActive", "createdAt");

-- Siparişler: "Hesabım" (kullanıcıya göre, yeniden eskiye) ve yönetim listesi.
-- (userId, createdAt) eski tek sütunlu userId indeksinin yerini alır.
DROP INDEX "Order_userId_idx";
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- Yorumlar: ürün sayfası (onaylılar, yeniden eskiye) ve yönetim moderasyon listesi.
CREATE INDEX "Review_productId_isApproved_createdAt_idx" ON "Review"("productId", "isApproved", "createdAt");
CREATE INDEX "Review_isApproved_createdAt_idx" ON "Review"("isApproved", "createdAt");

-- Favoriler: kullanıcı listesi (yeniden eskiye) ve ürüne göre arama/silme.
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");
CREATE INDEX "Favorite_productId_idx" ON "Favorite"("productId");
