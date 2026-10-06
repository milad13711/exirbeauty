-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "version" TEXT NOT NULL DEFAULT '1.0.0';

-- AlterTable
ALTER TABLE "TenantModule" ADD COLUMN     "installedVersion" TEXT;

-- CreateTable
CREATE TABLE "ModuleVersion" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "changelog" TEXT NOT NULL DEFAULT '',
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleVersion_moduleId_releasedAt_idx" ON "ModuleVersion"("moduleId", "releasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleVersion_moduleId_version_key" ON "ModuleVersion"("moduleId", "version");

-- AddForeignKey
ALTER TABLE "ModuleVersion" ADD CONSTRAINT "ModuleVersion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
