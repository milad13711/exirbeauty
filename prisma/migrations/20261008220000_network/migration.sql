-- CreateEnum
CREATE TYPE "NetworkStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'ANSWERED');

-- CreateTable
CREATE TABLE "NetworkRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "status" "NetworkStatus" NOT NULL DEFAULT 'SUBMITTED',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NetworkRequest_tenantId_createdAt_idx" ON "NetworkRequest"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "NetworkRequest_status_createdAt_idx" ON "NetworkRequest"("status", "createdAt");


-- A salon can have only one open request per service category at a time.
CREATE UNIQUE INDEX "network_one_open_per_category" ON "NetworkRequest" ("tenantId", "category") WHERE "status" <> 'ANSWERED';
