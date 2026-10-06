-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('PAID', 'DEBT', 'VOID');

-- CreateEnum
CREATE TYPE "LineKind" AS ENUM ('SERVICE', 'PRODUCT', 'OTHER');

-- CreateEnum
CREATE TYPE "PayMethod" AS ENUM ('CASH', 'CARD', 'ONLINE');

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL DEFAULT '',
    "apptId" TEXT,
    "subtotal" INTEGER NOT NULL,
    "discountPct" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "paid" INTEGER NOT NULL,
    "debt" INTEGER NOT NULL DEFAULT 0,
    "status" "SaleStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "voidReason" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "kind" "LineKind" NOT NULL,
    "refId" TEXT,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "staffId" TEXT,
    "commissionPct" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "method" "PayMethod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "ref" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PayMethod" NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PayMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayClosing" (
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "expectedCash" INTEGER NOT NULL,
    "countedCash" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayClosing_pkey" PRIMARY KEY ("tenantId","date")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("tenantId","key")
);

-- CreateIndex
CREATE INDEX "Sale_tenantId_date_idx" ON "Sale"("tenantId", "date");

-- CreateIndex
CREATE INDEX "Sale_tenantId_customerId_status_idx" ON "Sale"("tenantId", "customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_tenantId_number_key" ON "Sale"("tenantId", "number");

-- CreateIndex
CREATE INDEX "SaleLine_saleId_idx" ON "SaleLine"("saleId");

-- CreateIndex
CREATE INDEX "SalePayment_saleId_idx" ON "SalePayment"("saleId");

-- CreateIndex
CREATE INDEX "Expense_tenantId_date_idx" ON "Expense"("tenantId", "date");

-- CreateIndex
CREATE INDEX "DebtPayment_tenantId_date_idx" ON "DebtPayment"("tenantId", "date");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_apptId_fkey" FOREIGN KEY ("apptId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Money can't go negative, and the invoice arithmetic must hold even if application code is wrong.
ALTER TABLE "Sale" ADD CONSTRAINT "sale_amounts_valid" CHECK (
  "subtotal" >= 0 AND "discount" >= 0 AND "total" >= 0 AND "paid" >= 0 AND "debt" >= 0
  AND "discountPct" BETWEEN 0 AND 100
  AND "total" = "subtotal" - "discount"
  AND "paid" + "debt" <= "total"
);
ALTER TABLE "SaleLine" ADD CONSTRAINT "saleline_valid" CHECK ("qty" > 0 AND "price" >= 0 AND "commissionPct" BETWEEN 0 AND 100);
ALTER TABLE "SalePayment" ADD CONSTRAINT "salepayment_positive" CHECK ("amount" > 0);
ALTER TABLE "Expense" ADD CONSTRAINT "expense_positive" CHECK ("amount" > 0);
ALTER TABLE "DebtPayment" ADD CONSTRAINT "debtpayment_positive" CHECK ("amount" > 0);

-- An appointment can be invoiced once (a voided invoice frees it for a corrected one).
CREATE UNIQUE INDEX "sale_one_active_per_appt" ON "Sale" ("tenantId", "apptId") WHERE "apptId" IS NOT NULL AND "status" <> 'VOID';
