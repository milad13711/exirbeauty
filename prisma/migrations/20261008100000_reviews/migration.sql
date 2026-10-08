-- CreateEnum
CREATE TYPE "ReviewRoute" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterEnum
ALTER TYPE "SmsKind" ADD VALUE 'REVIEW';

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT,
    "customerId" TEXT,
    "staffId" TEXT,
    "serviceName" TEXT NOT NULL DEFAULT '',
    "tokenHash" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT NOT NULL DEFAULT '',
    "route" "ReviewRoute",
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewConfig" (
    "tenantId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "ReviewConfig_pkey" PRIMARY KEY ("tenantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_tokenHash_key" ON "Review"("tokenHash");

-- CreateIndex
CREATE INDEX "Review_tenantId_createdAt_idx" ON "Review"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_tenantId_saleId_key" ON "Review"("tenantId", "saleId");


ALTER TABLE "Review" ADD CONSTRAINT "review_rating_range" CHECK ("rating" IS NULL OR ("rating" BETWEEN 1 AND 5));
ALTER TABLE "ReviewConfig" ADD CONSTRAINT "review_threshold_range" CHECK ("threshold" BETWEEN 2 AND 5);
