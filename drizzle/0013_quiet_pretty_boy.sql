DROP INDEX "idx_user_wallets_pubkey";--> statement-breakpoint
ALTER TABLE "crop_logs" ADD COLUMN "campaign_id" text;--> statement-breakpoint
ALTER TABLE "crop_logs" ADD COLUMN "image_hashes" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "crop_logs" ADD COLUMN "hash_version" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "crop_logs" ALTER COLUMN "hash_version" SET DEFAULT 2;--> statement-breakpoint
ALTER TABLE "crop_logs" ADD COLUMN "farmer_wallet_address" text;--> statement-breakpoint
ALTER TABLE "crop_logs" ADD COLUMN "anchor_transaction_signature" text;--> statement-breakpoint
ALTER TABLE "crop_logs" ADD COLUMN "anchored_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crowdfunding_campaigns" ADD COLUMN "creator_wallet_address" text;--> statement-breakpoint
ALTER TABLE "crowdfunding_campaigns" ADD COLUMN "create_transaction_signature" text;--> statement-breakpoint
ALTER TABLE "crowdfunding_campaigns" ADD COLUMN "activation_transaction_signature" text;--> statement-breakpoint
ALTER TABLE "crowdfunding_milestones" ADD COLUMN "milestone_pubkey" text;--> statement-breakpoint
ALTER TABLE "crowdfunding_milestones" ADD COLUMN "create_transaction_signature" text;--> statement-breakpoint
ALTER TABLE "crowdfunding_milestones" ADD COLUMN "approval_transaction_signature" text;--> statement-breakpoint
ALTER TABLE "crowdfunding_milestones" ADD COLUMN "release_transaction_signature" text;--> statement-breakpoint
ALTER TABLE "crowdfunding_reward_tiers" ADD COLUMN "reward_tier_pubkey" text;--> statement-breakpoint
ALTER TABLE "crowdfunding_reward_tiers" ADD COLUMN "create_transaction_signature" text;--> statement-breakpoint
ALTER TABLE "crop_logs" ADD CONSTRAINT "crop_logs_campaign_id_crowdfunding_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crowdfunding_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_crop_logs_campaign" ON "crop_logs" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_crop_logs_farmer_previous_hash" ON "crop_logs" USING btree ("farmer_id","previous_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cf_contributions_pubkey" ON "crowdfunding_contributions" USING btree ("contribution_pubkey");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_wallets_pubkey" ON "user_wallets" USING btree ("public_key");--> statement-breakpoint
ALTER TABLE "crowdfunding_milestones" ADD CONSTRAINT "crowdfunding_milestones_milestone_pubkey_unique" UNIQUE("milestone_pubkey");--> statement-breakpoint
ALTER TABLE "crowdfunding_reward_tiers" ADD CONSTRAINT "crowdfunding_reward_tiers_reward_tier_pubkey_unique" UNIQUE("reward_tier_pubkey");
