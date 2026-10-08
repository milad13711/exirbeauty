-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'CANCELED');

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "months" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "creditLabel" TEXT NOT NULL DEFAULT '',
    "discountPct" INTEGER NOT NULL DEFAULT 0,
    "perks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "planId" TEXT,
    "planName" TEXT NOT NULL,
    "discountPct" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "expiryDate" DATE NOT NULL,
    "credits" INTEGER NOT NULL,
    "creditsTotal" INTEGER NOT NULL,
    "creditLabel" TEXT NOT NULL DEFAULT '',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipUse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipPlan_tenantId_archivedAt_idx" ON "MembershipPlan"("tenantId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_saleId_key" ON "Membership"("saleId");

-- CreateIndex
CREATE INDEX "Membership_tenantId_customerId_idx" ON "Membership"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Membership_tenantId_status_expiryDate_idx" ON "Membership"("tenantId", "status", "expiryDate");

-- CreateIndex
CREATE INDEX "MembershipUse_membershipId_idx" ON "MembershipUse"("membershipId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipUse" ADD CONSTRAINT "MembershipUse_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "MembershipPlan" ADD CONSTRAINT "mplan_valid" CHECK ("price" >= 0 AND "months" BETWEEN 1 AND 24 AND "credits" >= 0 AND "discountPct" BETWEEN 0 AND 60);
-- Sessions left can never go negative, whatever the application does.
ALTER TABLE "Membership" ADD CONSTRAINT "membership_credits" CHECK ("credits" >= 0 AND "credits" <= "creditsTotal" AND "expiryDate" >= "startDate");
