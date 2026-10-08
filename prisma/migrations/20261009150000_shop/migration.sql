-- CreateEnum
CREATE TYPE "StoreOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('NONE', 'WAITING', 'CREDITED', 'VOID');

-- CreateEnum
CREATE TYPE "WalletTxKind" AS ENUM ('COMMISSION', 'PLAN_PAYMENT', 'ADJUST');

-- AlterEnum
ALTER TYPE "PaymentKind" ADD VALUE 'STORE_ORDER';

-- CreateTable
CREATE TABLE "StoreProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "oldPrice" INTEGER,
    "commissionPct" INTEGER NOT NULL DEFAULT 10,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrder" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL DEFAULT '',
    "total" INTEGER NOT NULL,
    "status" "StoreOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "refTenantId" TEXT,
    "refVia" TEXT NOT NULL DEFAULT '',
    "commission" INTEGER NOT NULL DEFAULT 0,
    "commissionStatus" "CommissionStatus" NOT NULL DEFAULT 'NONE',
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "StoreOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantWallet" (
    "tenantId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantWallet_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "TenantWalletTx" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "WalletTxKind" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "ref" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantWalletTx_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreOrder_number_key" ON "StoreOrder"("number");

-- CreateIndex
CREATE INDEX "StoreOrder_refTenantId_createdAt_idx" ON "StoreOrder"("refTenantId", "createdAt");

-- CreateIndex
CREATE INDEX "StoreOrder_status_createdAt_idx" ON "StoreOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StoreOrderLine_orderId_idx" ON "StoreOrderLine"("orderId");

-- CreateIndex
CREATE INDEX "TenantWalletTx_tenantId_createdAt_idx" ON "TenantWalletTx"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "StoreOrderLine" ADD CONSTRAINT "StoreOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StoreOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrderLine" ADD CONSTRAINT "StoreOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "StoreProduct" ADD CONSTRAINT "storeproduct_valid" CHECK ("price" >= 0 AND "stock" >= 0 AND "commissionPct" BETWEEN 0 AND 50);
ALTER TABLE "StoreOrderLine" ADD CONSTRAINT "storeline_valid" CHECK ("qty" > 0 AND "price" >= 0);
-- A salon's wallet can never go negative.
ALTER TABLE "TenantWallet" ADD CONSTRAINT "wallet_nonneg" CHECK ("balance" >= 0);
-- An order's commission is credited to the wallet at most once.
CREATE UNIQUE INDEX "wallet_commission_once" ON "TenantWalletTx" ("kind", "ref") WHERE "kind" = 'COMMISSION' AND "ref" IS NOT NULL;
