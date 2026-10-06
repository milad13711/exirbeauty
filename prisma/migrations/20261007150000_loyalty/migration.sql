-- CreateEnum
CREATE TYPE "LoyaltyTxKind" AS ENUM ('EARN', 'EARN_REVERSE', 'REDEEM', 'ADJUST', 'CASHBACK', 'CASHBACK_REVERSE', 'REWARD_CREDIT', 'WALLET_SPEND', 'WALLET_REFUND', 'WALLET_ADJUST');

-- AlterEnum
ALTER TYPE "PayMethod" ADD VALUE 'WALLET';

-- CreateTable
CREATE TABLE "LoyaltyConfig" (
    "tenantId" TEXT NOT NULL,
    "tiers" JSONB NOT NULL,
    "earn" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "cashback" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyConfig_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "LoyaltyAccount" (
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "lifetime" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT '',
    "wallet" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("tenantId","customerId")
);

-- CreateTable
CREATE TABLE "LoyaltyTx" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" "LoyaltyTxKind" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "wallet" INTEGER NOT NULL DEFAULT 0,
    "pointsAfter" INTEGER NOT NULL,
    "walletAfter" INTEGER NOT NULL,
    "ref" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTx_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoyaltyTx_tenantId_customerId_createdAt_idx" ON "LoyaltyTx"("tenantId", "customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "LoyaltyAccount" ADD CONSTRAINT "LoyaltyAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTx" ADD CONSTRAINT "LoyaltyTx_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Points and wallet can never go negative, whatever the application does.
ALTER TABLE "LoyaltyAccount" ADD CONSTRAINT "loyalty_nonneg" CHECK ("points" >= 0 AND "lifetime" >= 0 AND "wallet" >= 0);

-- Each invoice earns, refunds and reverses at most once, even if two workers race or an event is replayed.
CREATE UNIQUE INDEX "loyalty_once_per_sale" ON "LoyaltyTx" ("tenantId", "kind", "ref")
  WHERE "ref" IS NOT NULL AND "kind" IN ('EARN', 'EARN_REVERSE', 'CASHBACK', 'CASHBACK_REVERSE', 'WALLET_SPEND', 'WALLET_REFUND');
