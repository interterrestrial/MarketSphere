-- AlterTable
ALTER TABLE "business_profiles"
ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "gst_number" TEXT,
ADD COLUMN     "service_area" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_gst_number_key" ON "business_profiles"("gst_number");

-- CreateIndex
CREATE INDEX "business_profiles_verification_status_idx" ON "business_profiles"("verification_status");