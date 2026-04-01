ALTER TYPE "public"."shared_entity_type" ADD VALUE 'PROXY_FARMER';--> statement-breakpoint
CREATE TABLE "proxy_farmer_follows" (
	"follower_id" text NOT NULL,
	"proxy_farmer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proxy_farmer_follows_follower_id_proxy_farmer_id_pk" PRIMARY KEY("follower_id","proxy_farmer_id")
);
--> statement-breakpoint
CREATE TABLE "proxy_farmers" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"bio" text,
	"avatar" text,
	"voivodeship" varchar(50),
	"county" varchar(100),
	"commune" varchar(100),
	"latitude" text,
	"longitude" text,
	"contact_methods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"products" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "target_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "proxy_farmer_id" text;--> statement-breakpoint
ALTER TABLE "proxy_farmer_follows" ADD CONSTRAINT "proxy_farmer_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxy_farmer_follows" ADD CONSTRAINT "proxy_farmer_follows_proxy_farmer_id_proxy_farmers_id_fk" FOREIGN KEY ("proxy_farmer_id") REFERENCES "public"."proxy_farmers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxy_farmers" ADD CONSTRAINT "proxy_farmers_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_proxy_farmer_id_proxy_farmers_id_fk" FOREIGN KEY ("proxy_farmer_id") REFERENCES "public"."proxy_farmers"("id") ON DELETE cascade ON UPDATE no action;