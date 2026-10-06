-- AlterEnum
ALTER TYPE "PaymentKind" ADD VALUE 'LISTING_PLAN';

-- AlterTable
ALTER TABLE "FinderListing" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "FinderStaff" ADD COLUMN     "staffId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "listingId" TEXT,
ALTER COLUMN "tenantId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FinderListing_tenantId_key" ON "FinderListing"("tenantId");

-- AddForeignKey
ALTER TABLE "FinderListing" ADD CONSTRAINT "FinderListing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

