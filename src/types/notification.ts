import type { NotificationType } from "@prisma/client";

/** Client-safe notification shape for the bell indicator and list. */
export interface NotificationDto {
  id: string;
  type: NotificationType;
  typeLabel: string;
  title: string;
  message: string;
  isRead: boolean;
  /** Present when the notice is about an order request. */
  orderRequestId: string | null;
  orderReference: string | null;
  createdAt: string;
}

export interface NotificationListDto {
  items: NotificationDto[];
  total: number;
  unread: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  ORDER_REQUEST: "New request",
  ORDER_RESPONSE: "Seller response",
  ORDER_UPDATE: "Order update",
  ACCOUNT_UPDATE: "Account update",
  SYSTEM: "MarketSphere",
};
