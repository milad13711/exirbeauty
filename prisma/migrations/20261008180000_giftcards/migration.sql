-- CreateEnum
CREATE TYPE "GiftStatus" AS ENUM ('ACTIVE', 'USED', 'VOID');

-- CreateEnum
CREATE TYPE "GiftTxKind" AS ENUM ('ISSUE', 'SPEND', 'REFUND', 'VOID');

-- AlterEnum
ALTER TYPE "LineKind" ADD VALUE 'GIFT';

-- AlterEnum
ALTER TYPE "PayMethod" ADD VALUE 'GIFT';

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "status" "GiftStatus" NOT NULL DEFAULT 'ACTIVE',
    "buyerId" TEXT,
    "fromName" TEXT NOT NULL,
    "toName" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "occasion" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardTx" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "kind" "GiftTxKind" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "ref" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardTx_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_codeHash_key" ON "GiftCard"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_saleId_key" ON "GiftCard"("saleId");

-- CreateIndex
CREATE INDEX "GiftCard_tenantId_createdAt_idx" ON "GiftCard"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "GiftCardTx_cardId_idx" ON "GiftCardTx"("cardId");

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTx" ADD CONSTRAINT "GiftCardTx_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A card's value is always between nothing and what it was sold for.
ALTER TABLE "GiftCard" ADD CONSTRAINT "giftcard_balance" CHECK ("balance" >= 0 AND "balance" <= "amount" AND "amount" > 0);
-- Each invoice spends from / refunds a card at most once.
CREATE UNIQUE INDEX "giftcard_tx_once" ON "GiftCardTx" ("cardId", "kind", "ref") WHERE "ref" IS NOT NULL AND "kind" IN ('SPEND', 'REFUND');
