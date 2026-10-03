-- AlterTable
ALTER TABLE "order_items"
ADD COLUMN     "proposed_quantity" INTEGER,
ADD COLUMN     "proposed_unit_price" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "order_requests" ADD COLUMN     "reference" TEXT;

-- Backfill existing rows before enforcing the constraint (no rows in dev, but
-- this keeps the migration safe on environments that already have requests).
UPDATE "order_requests"
SET "reference" = 'REQ-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6))
WHERE "reference" IS NULL;

-- AlterTable
ALTER TABLE "order_requests" ALTER COLUMN "reference" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "order_requests_reference_key" ON "order_requests"("reference");
