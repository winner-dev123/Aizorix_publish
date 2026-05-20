-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN "whatsappNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_whatsappNumber_key" ON "Clinic"("whatsappNumber");
