CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"actor_id" varchar(64),
	"action" varchar(50) NOT NULL,
	"entity" varchar(50) NOT NULL,
	"entity_id" varchar(64),
	"before" jsonb,
	"after" jsonb,
	"ip" varchar(50),
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"order_line_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"qty" integer NOT NULL,
	"line_total" integer NOT NULL,
	"tax_rate_bp" integer NOT NULL,
	"sac_code" varchar(10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_tax_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"tax_rate_bp" integer NOT NULL,
	"taxable_value" integer NOT NULL,
	"cgst" integer NOT NULL,
	"sgst" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"subtotal" integer NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"discount_reason" text,
	"discount_approved_by" uuid,
	"service_charge" integer DEFAULT 0 NOT NULL,
	"taxable_total" integer DEFAULT 0 NOT NULL,
	"cgst_total" integer DEFAULT 0 NOT NULL,
	"sgst_total" integer DEFAULT 0 NOT NULL,
	"round_off" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"paid_total" integer DEFAULT 0 NOT NULL,
	"price_mode" varchar(20) NOT NULL,
	"tax_scheme" varchar(20) NOT NULL,
	"invoice_number" varchar(32),
	"invoice_fy" varchar(10),
	"issued_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_bill_paid_invoice" CHECK (status <> 'PAID' OR invoice_number IS NOT NULL),
	CONSTRAINT "chk_bill_amounts" CHECK (subtotal >= 0 AND total >= 0)
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"handled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"translations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"available_from" varchar(5),
	"available_to" varchar(5),
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counters" (
	"restaurant_id" uuid NOT NULL,
	"key" varchar(50) NOT NULL,
	"value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"note_number" varchar(32) NOT NULL,
	"fy" varchar(10) NOT NULL,
	"reason" text NOT NULL,
	"taxable_value" integer NOT NULL,
	"cgst" integer NOT NULL,
	"sgst" integer NOT NULL,
	"total" integer NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"channel" varchar(50) NOT NULL,
	"type" varchar(50) NOT NULL,
	"session_id" uuid,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"scope_type" varchar(20) NOT NULL,
	"scope_id" varchar(64) NOT NULL,
	"key" varchar(64) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item_modifier_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"price" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	CONSTRAINT "chk_variant_price" CHECK (price >= 0)
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"translations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"image_url" text,
	"base_price" integer NOT NULL,
	"is_veg" boolean DEFAULT true NOT NULL,
	"allergens" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"spice_level" integer DEFAULT 0 NOT NULL,
	"tax_rate_bp" integer,
	"sac_code" varchar(10) DEFAULT '996331' NOT NULL,
	"availability" varchar(20) DEFAULT 'AVAILABLE' NOT NULL,
	"sold_out_until" timestamp with time zone,
	"daily_limit" integer,
	"sold_today" integer DEFAULT 0 NOT NULL,
	"prep_time_minutes" integer DEFAULT 15 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_menu_items_base_price" CHECK (base_price >= 0),
	CONSTRAINT "chk_menu_items_sold_today" CHECK (sold_today >= 0)
);
--> statement-breakpoint
CREATE TABLE "modifier_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"min_select" integer DEFAULT 0 NOT NULL,
	"max_select" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "chk_modifier_select_range" CHECK (min_select <= max_select)
);
--> statement-breakpoint
CREATE TABLE "modifier_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"price_delta" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" varchar(30) NOT NULL,
	"to_status" varchar(30) NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" varchar(64),
	"reason" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"variant_name" varchar(100),
	"modifiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unit_price" integer NOT NULL,
	"qty" integer NOT NULL,
	"line_total" integer NOT NULL,
	"tax_rate_bp" integer NOT NULL,
	"sac_code" varchar(10) DEFAULT '996331' NOT NULL,
	"note" text,
	"is_allergy_note" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"void_reason" text,
	CONSTRAINT "chk_order_line_qty" CHECK (qty >= 1 AND qty <= 99),
	CONSTRAINT "chk_order_line_total" CHECK (line_total >= 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"device_id" varchar(64) NOT NULL,
	"table_id" uuid NOT NULL,
	"table_label_at_order" varchar(50) NOT NULL,
	"business_date" varchar(10) NOT NULL,
	"order_number" integer NOT NULL,
	"round_no" integer DEFAULT 1 NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING_CONFIRMATION' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"source" varchar(20) DEFAULT 'CUSTOMER' NOT NULL,
	"placed_by_user_id" uuid,
	"note" text,
	"subtotal" integer NOT NULL,
	"eta_minutes" integer DEFAULT 20 NOT NULL,
	"rejection_reason" text,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"served_at" timestamp with time zone,
	CONSTRAINT "chk_order_subtotal" CHECK (subtotal >= 0)
);
--> statement-breakpoint
CREATE TABLE "paired_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"kind" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"pairing_code_hash" varchar(64),
	"pairing_expires_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paired_devices_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"method" varchar(20) NOT NULL,
	"kind" varchar(20) DEFAULT 'PAYMENT' NOT NULL,
	"amount" integer NOT NULL,
	"reference" varchar(100),
	"reverses_payment_id" uuid,
	"taken_by" uuid,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payment_amount" CHECK (amount > 0)
);
--> statement-breakpoint
CREATE TABLE "restaurant_settings" (
	"restaurant_id" uuid PRIMARY KEY NOT NULL,
	"default_tax_rate_bp" integer DEFAULT 500 NOT NULL,
	"price_mode" varchar(20) DEFAULT 'EXCLUSIVE' NOT NULL,
	"service_charge_bp" integer DEFAULT 0 NOT NULL,
	"service_charge_taxable" boolean DEFAULT true NOT NULL,
	"round_off_enabled" boolean DEFAULT true NOT NULL,
	"invoice_prefix" varchar(4) DEFAULT 'INV' NOT NULL,
	"opening_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_order_minutes_before_close" integer DEFAULT 30 NOT NULL,
	"business_day_cutoff" varchar(5) DEFAULT '04:00' NOT NULL,
	"order_guard_mode" varchar(30) DEFAULT 'CONFIRM_NEW_DEVICE' NOT NULL,
	"auto_accept" boolean DEFAULT false NOT NULL,
	"cancel_window_seconds" integer DEFAULT 60 NOT NULL,
	"session_idle_minutes" integer DEFAULT 120 NOT NULL,
	"max_active_orders" integer DEFAULT 5 NOT NULL,
	"max_order_value" integer DEFAULT 500000 NOT NULL,
	"max_session_value" integer DEFAULT 1500000 NOT NULL,
	"max_lines_per_order" integer DEFAULT 50 NOT NULL,
	"max_qty_per_line" integer DEFAULT 20 NOT NULL,
	"ack_warn_seconds" integer DEFAULT 90 NOT NULL,
	"kds_warn_minutes" integer DEFAULT 8 NOT NULL,
	"kds_late_minutes" integer DEFAULT 15 NOT NULL,
	"kitchen_capacity_tickets" integer DEFAULT 10 NOT NULL,
	"minutes_per_extra_ticket" integer DEFAULT 2 NOT NULL,
	"extra_delay_minutes" integer DEFAULT 0 NOT NULL,
	"ordering_paused_until" timestamp with time zone,
	"pause_message" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"legal_name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"logo_url" text,
	"brand_color" varchar(30) DEFAULT '#f97316' NOT NULL,
	"address" text NOT NULL,
	"state_code" varchar(10) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"gstin" varchar(15),
	"fssai_number" varchar(14),
	"tax_scheme" varchar(20) DEFAULT 'REGULAR' NOT NULL,
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"device_id" varchar(64) NOT NULL,
	"label" varchar(50) DEFAULT 'Guest 1' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"blocked_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "table_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"table_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'OPEN' NOT NULL,
	"closed_reason" varchar(30),
	"opened_by" varchar(50) NOT NULL,
	"table_code_hash" varchar(64),
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bill_requested_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"guest_name" varchar(100),
	"guest_phone" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"label" varchar(50) NOT NULL,
	"zone" varchar(50) DEFAULT 'Main Dining' NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"token" varchar(64) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tables_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"pin_hash" text,
	"role" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"token_version" integer DEFAULT 1 NOT NULL,
	"last_login_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_lines" ADD CONSTRAINT "bill_lines_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_lines" ADD CONSTRAINT "bill_lines_order_line_id_order_lines_id_fk" FOREIGN KEY ("order_line_id") REFERENCES "public"."order_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_tax_lines" ADD CONSTRAINT "bill_tax_lines_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counters" ADD CONSTRAINT "counters_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_modifier_groups" ADD CONSTRAINT "menu_item_modifier_groups_item_id_menu_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_modifier_groups" ADD CONSTRAINT "menu_item_modifier_groups_group_id_modifier_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."modifier_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_item_id_menu_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_group_id_modifier_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."modifier_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_item_id_menu_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paired_devices" ADD CONSTRAINT "paired_devices_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_settings" ADD CONSTRAINT "restaurant_settings_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_devices" ADD CONSTRAINT "session_devices_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_live_bill_per_session" ON "bills" USING btree ("session_id") WHERE status IN ('DRAFT', 'PAID');--> statement-breakpoint
CREATE UNIQUE INDEX "unique_invoice_number_fy" ON "bills" USING btree ("restaurant_id","invoice_fy","invoice_number") WHERE invoice_number IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_calls_status" ON "calls" USING btree ("restaurant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_categories_sort" ON "categories" USING btree ("restaurant_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "pk_counters" ON "counters" USING btree ("restaurant_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_credit_note_fy" ON "credit_notes" USING btree ("restaurant_id","fy","note_number");--> statement-breakpoint
CREATE INDEX "idx_events_lookup" ON "events" USING btree ("restaurant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "pk_idempotency" ON "idempotency_keys" USING btree ("scope_type","scope_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_item_mod_group" ON "menu_item_modifier_groups" USING btree ("item_id","group_id");--> statement-breakpoint
CREATE INDEX "idx_variants_sort" ON "menu_item_variants" USING btree ("item_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_menu_items_sort" ON "menu_items" USING btree ("restaurant_id","category_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_mod_options_sort" ON "modifier_options" USING btree ("group_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_order_number_per_day" ON "orders" USING btree ("restaurant_id","business_date","order_number");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("restaurant_id","status","placed_at");--> statement-breakpoint
CREATE INDEX "idx_orders_session" ON "orders" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_session_device" ON "session_devices" USING btree ("session_id","device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_live_session_per_table" ON "table_sessions" USING btree ("table_id") WHERE status IN ('OPEN', 'BILL_REQUESTED', 'BILLING');--> statement-breakpoint
CREATE INDEX "idx_sessions_activity" ON "table_sessions" USING btree ("restaurant_id","status","last_activity_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_active_table_label" ON "tables" USING btree ("restaurant_id","label") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_restaurant_email" ON "users" USING btree ("restaurant_id","email");