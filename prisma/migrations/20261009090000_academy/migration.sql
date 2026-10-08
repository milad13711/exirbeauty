-- CreateEnum
CREATE TYPE "CourseAudience" AS ENUM ('ALL', 'OWNER', 'STAFF');

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "audience" "CourseAudience" NOT NULL DEFAULT 'ALL',
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "price" INTEGER NOT NULL DEFAULT 0,
    "inPlans" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "lessons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "done" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "paid" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "serial" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_serial_key" ON "Enrollment"("serial");

-- CreateIndex
CREATE INDEX "Enrollment_tenantId_idx" ON "Enrollment"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "Course" ADD CONSTRAINT "course_valid" CHECK ("price" >= 0 AND "hours" > 0);
