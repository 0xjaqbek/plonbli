export type EventProperties = {
  "auth.registered": { method: "email" | "google" | "facebook" };
  "auth.logged_in": { method: "email" | "google" | "facebook" };
  "auth.logged_out": undefined;
  "listing.viewed": { listingId: string; farmerId: string; category: string };
  "listing.created": { listingId: string; category: string; hasAvailability: boolean };
  "listing.availability_updated": { listingId: string; availability: string };
  "cart.item_added": { listingId: string; farmerId: string; price: number };
  "cart.item_removed": { listingId: string };
  "order.placed": { orderId: string; farmerId: string; itemCount: number; totalValue: number };
  "order.status_changed": { orderId: string; fromStatus: string; toStatus: string };
  "post.created": { hasMedia: boolean };
  "post.liked": undefined;
  "group.joined": { groupId: string };
  "event.rsvp": { eventId: string };
  "conversation.started": { recipientRole: string };
  "message.sent": undefined;
  "role.upgraded_to_farmer": undefined;
};

export type EventName = keyof EventProperties;
