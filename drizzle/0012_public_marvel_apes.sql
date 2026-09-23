CREATE TYPE "public"."campaign_category" AS ENUM('FARMER_INVESTMENT', 'GROUP_PRE_ORDER', 'COMMUNITY_PROJECT');--> statement-breakpoint
CREATE TYPE "public"."campaign_funding_model" AS ENUM('ALL_OR_NOTHING', 'KEEP_WHAT_YOU_RAISE');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('SETUP', 'ACTIVE', 'SUCCESSFUL', 'FAILED', 'FINALIZED');--> statement-breakpoint
CREATE TYPE "public"."contribution_source" AS ENUM('APP', 'ACTION', 'SYNC');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('PENDING', 'APPROVED', 'RELEASED');--> statement-breakpoint
CREATE TABLE "crowdfunding_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"group_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"images" text[] DEFAULT '{}' NOT NULL,
	"category" "campaign_category" NOT NULL,
	"campaign_pubkey" text,
	"currency_mint" text NOT NULL,
	"funding_model" "campaign_funding_model" NOT NULL,
	"goal_amount" text NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"status" "campaign_status" DEFAULT 'SETUP' NOT NULL,
	"content_hash" text,
	"raised_amount" text DEFAULT '0' NOT NULL,
	"backer_count" integer DEFAULT 0 NOT NULL,
	"milestone_count" smallint DEFAULT 0 NOT NULL,
	"reward_tier_count" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crowdfunding_campaigns_campaign_pubkey_unique" UNIQUE("campaign_pubkey")
);
--> statement-breakpoint
CREATE TABLE "crowdfunding_contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"backer_id" text,
	"reward_tier_id" text,
	"amount" text NOT NULL,
	"wallet_address" text,
	"contribution_pubkey" text,
	"transaction_signature" text,
	"source" "contribution_source" DEFAULT 'APP' NOT NULL,
	"refunded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crowdfunding_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"milestone_index" smallint NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"description_hash" text,
	"target_amount" text NOT NULL,
	"status" "milestone_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crowdfunding_reward_tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"tier_index" smallint NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"description_hash" text,
	"price" text NOT NULL,
	"max_backers" integer DEFAULT 0 NOT NULL,
	"current_backers" integer DEFAULT 0 NOT NULL,
	"is_product_linked" boolean DEFAULT false NOT NULL,
	"product_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crowdfunding_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"public_key" text NOT NULL,
	"encrypted_secret_key" text,
	"is_custodial" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "crowdfunding" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "crowdfunding_campaigns" ADD CONSTRAINT "crowdfunding_campaigns_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crowdfunding_campaigns" ADD CONSTRAINT "crowdfunding_campaigns_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crowdfunding_contributions" ADD CONSTRAINT "crowdfunding_contributions_campaign_id_crowdfunding_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crowdfunding_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crowdfunding_contributions" ADD CONSTRAINT "crowdfunding_contributions_backer_id_users_id_fk" FOREIGN KEY ("backer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crowdfunding_contributions" ADD CONSTRAINT "crowdfunding_contributions_reward_tier_id_crowdfunding_reward_tiers_id_fk" FOREIGN KEY ("reward_tier_id") REFERENCES "public"."crowdfunding_reward_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crowdfunding_milestones" ADD CONSTRAINT "crowdfunding_milestones_campaign_id_crowdfunding_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crowdfunding_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crowdfunding_reward_tiers" ADD CONSTRAINT "crowdfunding_reward_tiers_campaign_id_crowdfunding_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crowdfunding_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crowdfunding_reward_tiers" ADD CONSTRAINT "crowdfunding_reward_tiers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crowdfunding_updates" ADD CONSTRAINT "crowdfunding_updates_campaign_id_crowdfunding_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crowdfunding_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crowdfunding_updates" ADD CONSTRAINT "crowdfunding_updates_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cf_campaigns_creator" ON "crowdfunding_campaigns" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_cf_campaigns_group" ON "crowdfunding_campaigns" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_cf_campaigns_status" ON "crowdfunding_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cf_campaigns_pubkey" ON "crowdfunding_campaigns" USING btree ("campaign_pubkey");--> statement-breakpoint
CREATE INDEX "idx_cf_campaigns_deadline" ON "crowdfunding_campaigns" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "idx_cf_contributions_campaign" ON "crowdfunding_contributions" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_cf_contributions_backer" ON "crowdfunding_contributions" USING btree ("backer_id");--> statement-breakpoint
CREATE INDEX "idx_cf_contributions_wallet" ON "crowdfunding_contributions" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "idx_cf_milestones_campaign" ON "crowdfunding_milestones" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_cf_reward_tiers_campaign" ON "crowdfunding_reward_tiers" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_cf_updates_campaign" ON "crowdfunding_updates" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_user_wallets_user" ON "user_wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_wallets_pubkey" ON "user_wallets" USING btree ("public_key");