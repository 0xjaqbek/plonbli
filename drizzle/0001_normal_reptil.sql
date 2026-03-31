CREATE TYPE "public"."shared_entity_type" AS ENUM('FARMER', 'EVENT', 'CROP_LOG', 'PRODUCT');--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "shared_entity_type" "shared_entity_type";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "shared_entity_id" text;