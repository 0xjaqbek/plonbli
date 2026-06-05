CREATE TYPE "public"."profile_type" AS ENUM('PRIVATE', 'SMALL_FARM', 'MEDIUM_FARM', 'LARGE_FARM');--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"messages" boolean DEFAULT true NOT NULL,
	"social" boolean DEFAULT true NOT NULL,
	"marketplace" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fcm_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_fcm_token_unique" UNIQUE("fcm_token")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_type" "profile_type";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "age_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "privacy_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_push_subscriptions_user_id" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_comments_post_created" ON "comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_conversation_members_user_id" ON "conversation_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_follows_followee_id" ON "follows" USING btree ("followee_id");--> statement-breakpoint
CREATE INDEX "idx_listings_product_id" ON "listings" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_listings_availability_created" ON "listings" USING btree ("availability","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation_created" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_customer_created" ON "orders" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_farmer_created" ON "orders" USING btree ("farmer_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_posts_author_created" ON "posts" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_posts_group_created" ON "posts" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_posts_visibility_created" ON "posts" USING btree ("visibility","created_at");--> statement-breakpoint
CREATE INDEX "idx_products_farmer_id" ON "products" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "idx_products_category_id" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_voivodeship" ON "users" USING btree ("voivodeship");