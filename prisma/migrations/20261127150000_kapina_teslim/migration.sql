-- Kuryeyle kapına teslim: siparişin teslimat yöntemi. Eski siparişlerin hepsi mağazadan teslimdir.
ALTER TABLE "Order" ADD COLUMN "deliveryMethod" TEXT NOT NULL DEFAULT 'magaza';
