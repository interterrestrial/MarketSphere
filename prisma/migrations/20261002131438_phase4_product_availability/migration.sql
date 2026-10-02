-- AlterTable
ALTER TABLE "products" ADD COLUMN     "availability_note" TEXT,
ADD COLUMN     "is_available" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "products_status_is_available_idx" ON "products"("status", "is_available");
