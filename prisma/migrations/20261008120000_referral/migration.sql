-- AlterEnum
ALTER TYPE "LoyaltyTxKind" ADD VALUE 'REFERRAL';

-- CreateTable
CREATE TABLE "ReferralConfig" (
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "referrerPts" INTEGER NOT NULL DEFAULT 100,
    "friendOff" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "ReferralConfig_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "ReferralLink" (
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "ReferralLink_pkey" PRIMARY KEY ("tenantId","customerId")
);

-- CreateTable
CREATE TABLE "ReferralReward" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralLink_code_key" ON "ReferralLink"("code");

-- CreateIndex
CREATE INDEX "ReferralReward_tenantId_referrerId_idx" ON "ReferralReward"("tenantId", "referrerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralReward_tenantId_friendId_key" ON "ReferralReward"("tenantId", "friendId");


ALTER TABLE "ReferralConfig" ADD CONSTRAINT "referral_config_range" CHECK ("referrerPts" >= 0 AND "friendOff" BETWEEN 0 AND 60);
ALTER TABLE "ReferralReward" ADD CONSTRAINT "referral_not_self" CHECK ("referrerId" <> "friendId");
