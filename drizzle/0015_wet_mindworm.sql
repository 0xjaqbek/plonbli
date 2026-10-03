CREATE TABLE "crop_log_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"crop_log_id" text NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crop_log_comments" ADD CONSTRAINT "crop_log_comments_crop_log_id_crop_logs_id_fk" FOREIGN KEY ("crop_log_id") REFERENCES "public"."crop_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_log_comments" ADD CONSTRAINT "crop_log_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_crop_log_comments_entry_created" ON "crop_log_comments" USING btree ("crop_log_id","created_at");