-- Arama artık büyük/küçük harf ve Türkçe karakter farkını yok sayar (lib/search.ts, lib/search-fold.ts):
-- sorgular lower(translate(kolon, 'İIıÇç...', 'iiiicc...')) ifadesi üzerinden çalışır. Önceki migration'daki ham
-- sütun indeksleri bu ifadeyle kullanılamaz, bu yüzden aynı ifade üzerinde yenileri kurulur.
-- Ifade lib/search.ts içindeki foldSql ile birebir aynı kalmalıdır; değişirse indeksler de yeniden kurulmalı.

DROP INDEX IF EXISTS "Product_name_idx";
DROP INDEX IF EXISTS "Product_description_idx";
DROP INDEX IF EXISTS "Product_sku_idx";

CREATE INDEX "Product_name_fold_trgm_idx" ON "Product"
  USING GIN (lower(translate("name", 'İIıÇçĞğÖöŞşÜüÂâÎîÛû', 'iiiccggoossuuaaiiuu')) gin_trgm_ops);
CREATE INDEX "Product_description_fold_trgm_idx" ON "Product"
  USING GIN (lower(translate("description", 'İIıÇçĞğÖöŞşÜüÂâÎîÛû', 'iiiccggoossuuaaiiuu')) gin_trgm_ops);
CREATE INDEX "Product_sku_fold_trgm_idx" ON "Product"
  USING GIN (lower(translate("sku", 'İIıÇçĞğÖöŞşÜüÂâÎîÛû', 'iiiccggoossuuaaiiuu')) gin_trgm_ops);
