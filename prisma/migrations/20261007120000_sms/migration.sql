-- CreateEnum
CREATE TYPE "SmsKind" AS ENUM ('MANUAL', 'CONFIRM', 'MOVED', 'CANCEL', 'REMINDER_24', 'REMINDER_2', 'THANKS', 'BIRTHDAY');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SmsTxKind" AS ENUM ('TOPUP', 'BONUS', 'SEND', 'REFUND', 'ADJUST');

-- AlterEnum
ALTER TYPE "PaymentKind" ADD VALUE 'SMS_TOPUP';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "packageId" TEXT;

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SmsAccount" (
    "tenantId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lowThreshold" INTEGER NOT NULL DEFAULT 20000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsAccount_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "phone" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "parts" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "kind" "SmsKind" NOT NULL,
    "status" "SmsStatus" NOT NULL,
    "reason" TEXT,
    "providerRef" TEXT,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsTx" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "kind" "SmsTxKind" NOT NULL,
    "ref" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsTx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "bonusPct" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SmsPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsScenario" (
    "tenantId" TEXT NOT NULL,
    "kind" "SmsKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "template" TEXT NOT NULL,

    CONSTRAINT "SmsScenario_pkey" PRIMARY KEY ("tenantId","kind")
);

-- CreateIndex
CREATE INDEX "SmsMessage_tenantId_createdAt_idx" ON "SmsMessage"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SmsMessage_tenantId_status_createdAt_idx" ON "SmsMessage"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SmsTx_tenantId_createdAt_idx" ON "SmsTx"("tenantId", "createdAt");


-- An automatic message (confirmation, reminder, birthday…) goes out at most once per (kind, relatedId), even if two
-- workers race. Failed and blocked attempts don't count, so a retry after a top-up is still possible.
CREATE UNIQUE INDEX "sms_once_per_event" ON "SmsMessage" ("tenantId", "kind", "relatedId") WHERE "relatedId" IS NOT NULL AND "status" IN ('QUEUED', 'SENT');

-- Credit can never go negative, whatever the application does.
ALTER TABLE "SmsAccount" ADD CONSTRAINT "sms_balance_nonneg" CHECK ("balance" >= 0);
ALTER TABLE "SmsMessage" ADD CONSTRAINT "sms_msg_valid" CHECK ("parts" > 0 AND "cost" >= 0);
