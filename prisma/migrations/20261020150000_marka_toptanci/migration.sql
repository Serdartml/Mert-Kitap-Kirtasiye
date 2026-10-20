-- AlterTable: toptancı olarak işaretlenen markanın adı sitede gösterilmez.
ALTER TABLE "Brand" ADD COLUMN "isWholesaler" BOOLEAN NOT NULL DEFAULT false;
