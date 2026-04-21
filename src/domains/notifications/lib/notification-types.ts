export type NotificationCategory = "messages" | "social" | "marketplace";

export interface NotificationPayload {
  category: NotificationCategory;
  title: string;
  body: string;
  url: string;
}

export function buildMessageNotification(
  senderName: string,
  content: string,
  conversationId: string
): NotificationPayload {
  return {
    category: "messages",
    title: senderName,
    body: content.length > 100 ? content.substring(0, 97) + "..." : content,
    url: `/messages/${conversationId}`,
  };
}

export function buildFollowNotification(
  followerName: string,
  followerId: string
): NotificationPayload {
  return {
    category: "social",
    title: "Nowy obserwujący",
    body: `${followerName} zaczął(a) Cię obserwować`,
    url: `/profile/${followerId}`,
  };
}

export function buildCommentNotification(
  commenterName: string,
  postId: string
): NotificationPayload {
  return {
    category: "social",
    title: "Nowy komentarz",
    body: `${commenterName} skomentował(a) Twój post`,
    url: `/posts/${postId}`,
  };
}

export function buildReactionNotification(
  reactorName: string,
  postId: string
): NotificationPayload {
  return {
    category: "social",
    title: "Nowa reakcja",
    body: `${reactorName} polubił(a) Twój post`,
    url: `/posts/${postId}`,
  };
}

export function buildNewListingNotification(
  farmerName: string,
  productName: string,
  listingId: string
): NotificationPayload {
  return {
    category: "marketplace",
    title: `Nowa oferta: ${productName}`,
    body: `${farmerName} dodał(a) nową ofertę`,
    url: `/listings/${listingId}`,
  };
}

export function buildNewOrderNotification(
  customerName: string,
  orderNumber: string,
  orderId: string
): NotificationPayload {
  return {
    category: "marketplace",
    title: "Nowe zamówienie",
    body: `${customerName} złożył(a) zamówienie ${orderNumber}`,
    url: `/farmer/orders/${orderId}`,
  };
}

export function buildOrderStatusNotification(
  status: string,
  orderNumber: string,
  orderId: string
): NotificationPayload {
  const labels: Record<string, string> = {
    CONFIRMED: "potwierdzone",
    PREPARING: "w przygotowaniu",
    SHIPPED: "wysłane",
    READY_FOR_PICKUP: "gotowe do odbioru",
    DELIVERED: "dostarczone",
    COMPLETED: "zakończone",
    CANCELLED: "anulowane",
  };
  return {
    category: "marketplace",
    title: "Aktualizacja zamówienia",
    body: `Zamówienie ${orderNumber} jest ${labels[status] ?? status}`,
    url: `/orders/${orderId}`,
  };
}
