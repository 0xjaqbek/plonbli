ALTER TABLE "orders" ADD COLUMN "customer_has_seen" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "farmer_has_seen" boolean DEFAULT true NOT NULL;