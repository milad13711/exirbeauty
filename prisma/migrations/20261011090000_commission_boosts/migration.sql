-- CreateTable
CREATE TABLE "CommissionBoost" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "extraPct" INTEGER NOT NULL,
    "category" TEXT,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CommissionBoost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionBoost_active_startsOn_endsOn_idx" ON "CommissionBoost"("active", "startsOn", "endsOn");

ALTER TABLE "CommissionBoost" ADD CONSTRAINT "boost_valid" CHECK ("extraPct" BETWEEN 1 AND 30 AND "endsOn" >= "startsOn");
