-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "order_request_id" UUID;

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_order_request_id_idx" ON "notifications"("order_request_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_order_request_id_fkey" FOREIGN KEY ("order_request_id") REFERENCES "order_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
