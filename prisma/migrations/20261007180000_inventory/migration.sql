-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('RETAIL', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "StockMoveKind" AS ENUM ('RECEIVE', 'SALE', 'SALE_VOID', 'ADJUST');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ProductKind" NOT NULL DEFAULT 'RETAIL',
    "price" INTEGER NOT NULL DEFAULT 0,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reorder" INTEGER NOT NULL DEFAULT 3,
    "supplier" TEXT NOT NULL DEFAULT '',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMove" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "StockMoveKind" NOT NULL,
    "delta" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "unitCost" INTEGER,
    "ref" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMove_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_tenantId_archivedAt_idx" ON "Product"("tenantId", "archivedAt");

-- CreateIndex
CREATE INDEX "StockMove_tenantId_productId_createdAt_idx" ON "StockMove"("tenantId", "productId", "createdAt");

-- AddForeignKey
ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Stock and prices can never go negative, whatever the application does.
ALTER TABLE "Product" ADD CONSTRAINT "product_nonneg" CHECK ("stock" >= 0 AND "price" >= 0 AND "cost" >= 0 AND "reorder" >= 0);

-- An invoice deducts (and a void restores) each product at most once, even if an event is replayed.
CREATE UNIQUE INDEX "stock_once_per_sale" ON "StockMove" ("tenantId", "productId", "kind", "ref") WHERE "ref" IS NOT NULL AND "kind" IN ('SALE', 'SALE_VOID');
