-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('BEFORE_AFTER', 'SERVICE', 'OFFER', 'BIRTHDAY', 'TIPS');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "ContentPost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "PostKind" NOT NULL,
    "caption" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "service" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" DATE,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentPost_tenantId_createdAt_idx" ON "ContentPost"("tenantId", "createdAt");


-- A scheduled post must say when; a published one must say it was.
ALTER TABLE "ContentPost" ADD CONSTRAINT "post_status_fields" CHECK (("status" <> 'SCHEDULED' OR "scheduledFor" IS NOT NULL) AND ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL));
