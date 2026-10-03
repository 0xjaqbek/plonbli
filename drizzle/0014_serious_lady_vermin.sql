CREATE TYPE "public"."review_verification_source" AS ENUM('UNVERIFIED', 'ORDER', 'CAMPAIGN');--> statement-breakpoint
ALTER TABLE "crowdfunding_contributions" ADD COLUMN "refund_transaction_signature" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "hash_version" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "verification_source" "review_verification_source" DEFAULT 'UNVERIFIED' NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "verification_evidence_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reviews_verification_evidence" ON "reviews" USING btree ("verification_evidence_id");--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "hash_version" SET DEFAULT 2;
