-- Critical: chat polling (every 3s hits this query)
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_created" ON "messages" ("conversation_id", "created_at");--> statement-breakpoint
-- Critical: NextAuth session lookup on every request
CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions" ("user_id");--> statement-breakpoint
-- Critical: conversation membership check on every chat poll
CREATE INDEX IF NOT EXISTS "idx_conversation_members_user_id" ON "conversation_members" ("user_id");--> statement-breakpoint
-- Feed: chronological post queries
CREATE INDEX IF NOT EXISTS "idx_posts_author_created" ON "posts" ("author_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_posts_group_created" ON "posts" ("group_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_posts_visibility_created" ON "posts" ("visibility", "created_at" DESC);--> statement-breakpoint
-- Marketplace: product and listing browsing
CREATE INDEX IF NOT EXISTS "idx_products_farmer_id" ON "products" ("farmer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_category_id" ON "products" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_listings_product_id" ON "listings" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_listings_availability_created" ON "listings" ("availability", "created_at" DESC);--> statement-breakpoint
-- Orders: customer and farmer dashboards
CREATE INDEX IF NOT EXISTS "idx_orders_customer_created" ON "orders" ("customer_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_farmer_created" ON "orders" ("farmer_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" ("status");--> statement-breakpoint
-- Comments: loading comments per post
CREATE INDEX IF NOT EXISTS "idx_comments_post_created" ON "comments" ("post_id", "created_at");--> statement-breakpoint
-- Follows: reverse lookup (who follows me, follower count)
CREATE INDEX IF NOT EXISTS "idx_follows_followee_id" ON "follows" ("followee_id");--> statement-breakpoint
-- Notifications: token lookup per user
CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_user_id" ON "push_subscriptions" ("user_id");--> statement-breakpoint
-- Users: geographic and role filtering in marketplace
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_voivodeship" ON "users" ("voivodeship");
