import { relations } from "drizzle-orm";
import { users } from "./users";
import { pushSubscriptions } from "./push-subscriptions";
import { notificationPreferences } from "./notification-preferences";
import { invitations } from "./invitations";
import { categories } from "./categories";
import { products } from "./products";
import { listings } from "./listings";
import { conversations } from "./conversations";
import { conversationMembers } from "./conversation-members";
import { messages } from "./messages";
import { groups } from "./groups";
import { groupMembers } from "./group-members";
import { posts } from "./posts";
import { comments } from "./comments";
import { reactions } from "./reactions";
import { follows, proxyFarmerFollows } from "./follows";
import { proxyFarmers } from "./proxy-farmers";
import { events } from "./events";
import { eventRsvps } from "./event-rsvps";
import { cropLogs } from "./crop-logs";
import { reviews } from "./reviews";
import { pickupPoints } from "./pickup-points";
import { collections } from "./collections";
import { collectionItems } from "./collection-items";
import { authAccounts } from "./auth-accounts";
import { orders, orderItems, orderStatusHistory } from "./orders";
import { pickupSlots } from "./pickup-slots";
import { cartItems } from "./cart-items";

export const authAccountsRelations = relations(authAccounts, ({ one }) => ({
  user: one(users, {
    fields: [authAccounts.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  farmer: one(users, {
    fields: [products.farmerId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one }) => ({
  product: one(products, {
    fields: [listings.productId],
    references: [products.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  members: many(conversationMembers),
  messages: many(messages),
  order: one(orders, {
    fields: [conversations.orderId],
    references: [orders.id],
  }),
  listing: one(listings, {
    fields: [conversations.listingId],
    references: [listings.id],
  }),
}));

export const conversationMembersRelations = relations(
  conversationMembers,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationMembers.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationMembers.userId],
      references: [users.id],
    }),
  })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
  }),
  members: many(groupMembers),
  posts: many(posts),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [posts.groupId],
    references: [groups.id],
  }),
  comments: many(comments),
  reactions: many(reactions),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  post: one(posts, {
    fields: [reactions.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  followee: one(users, {
    fields: [follows.followeeId],
    references: [users.id],
    relationName: "followee",
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, {
    fields: [events.creatorId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [events.groupId],
    references: [groups.id],
  }),
  rsvps: many(eventRsvps),
}));

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
  event: one(events, {
    fields: [eventRsvps.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRsvps.userId],
    references: [users.id],
  }),
}));

export const cropLogsRelations = relations(cropLogs, ({ one }) => ({
  farmer: one(users, {
    fields: [cropLogs.farmerId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cropLogs.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: "reviewer",
  }),
  target: one(users, {
    fields: [reviews.targetId],
    references: [users.id],
    relationName: "reviewTarget",
  }),
  proxyFarmer: one(proxyFarmers, {
    fields: [reviews.proxyFarmerId],
    references: [proxyFarmers.id],
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));

export const proxyFarmersRelations = relations(proxyFarmers, ({ one, many }) => ({
  creator: one(users, {
    fields: [proxyFarmers.creatorId],
    references: [users.id],
  }),
  follows: many(proxyFarmerFollows),
}));

export const proxyFarmerFollowsRelations = relations(proxyFarmerFollows, ({ one }) => ({
  follower: one(users, {
    fields: [proxyFarmerFollows.followerId],
    references: [users.id],
  }),
  proxyFarmer: one(proxyFarmers, {
    fields: [proxyFarmerFollows.proxyFarmerId],
    references: [proxyFarmers.id],
  }),
}));

export const pickupPointsRelations = relations(pickupPoints, ({ one }) => ({
  creator: one(users, {
    fields: [pickupPoints.createdBy],
    references: [users.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  group: one(groups, {
    fields: [collections.groupId],
    references: [groups.id],
  }),
  listing: one(listings, {
    fields: [collections.listingId],
    references: [listings.id],
  }),
  coordinator: one(users, {
    fields: [collections.coordinatorId],
    references: [users.id],
  }),
  items: many(collectionItems),
}));

export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionItems.collectionId],
    references: [collections.id],
  }),
  user: one(users, {
    fields: [collectionItems.userId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, { fields: [orders.customerId], references: [users.id], relationName: "customerOrders" }),
  farmer: one(users, { fields: [orders.farmerId], references: [users.id], relationName: "farmerOrders" }),
  pickupSlot: one(pickupSlots, { fields: [orders.pickupSlotId], references: [pickupSlots.id] }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  listing: one(listings, { fields: [orderItems.listingId], references: [listings.id] }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
  createdByUser: one(users, { fields: [orderStatusHistory.createdBy], references: [users.id] }),
}));

export const pickupSlotsRelations = relations(pickupSlots, ({ one }) => ({
  farmer: one(users, { fields: [pickupSlots.farmerId], references: [users.id] }),
  order: one(orders, { fields: [pickupSlots.orderId], references: [orders.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  listing: one(listings, { fields: [cartItems.listingId], references: [listings.id] }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  user: one(users, {
    fields: [invitations.userId],
    references: [users.id],
  }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));
