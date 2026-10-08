-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "walletUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StoreOrder" ADD COLUMN     "goodsTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shippingCost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trackingCode" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "brandColor" TEXT;

UPDATE "StoreOrder" SET "goodsTotal" = "total" WHERE "goodsTotal" = 0;
ALTER TABLE "Payment" ADD CONSTRAINT "payment_wallet_used" CHECK ("walletUsed" >= 0 AND "walletUsed" <= "amount");
