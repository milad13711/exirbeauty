-- AlterTable
ALTER TABLE "ContentPost" ADD COLUMN     "afterMediaId" TEXT,
ADD COLUMN     "beforeMediaId" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "logoMediaId" TEXT;

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Media_tenantId_idx" ON "Media"("tenantId");

ALTER TABLE "Media" ADD CONSTRAINT "media_valid" CHECK ("size" > 0 AND "size" <= 700000 AND "mime" IN ( 'image/png','image/jpeg','image/webp'));
