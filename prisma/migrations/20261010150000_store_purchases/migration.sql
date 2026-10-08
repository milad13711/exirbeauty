-- CreateTable
CREATE TABLE "StorePurchase" (
    "id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "lines" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorePurchase_pkey" PRIMARY KEY ("id")
);

