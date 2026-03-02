CREATE TYPE "public"."equipment_type" AS ENUM('taxameter', 'suft', 'none');--> statement-breakpoint
CREATE TYPE "public"."inspection_result" AS ENUM('approved', 'approved_with_notes', 'failed');--> statement-breakpoint
CREATE TYPE "public"."inspection_type" AS ENUM('besiktning', 'taxameter', 'suft');--> statement-breakpoint
CREATE TYPE "public"."mileage_source" AS ENUM('manual', 'api');--> statement-breakpoint
CREATE TYPE "public"."note_tag" AS ENUM('issue', 'maintenance', 'general');--> statement-breakpoint
CREATE TYPE "public"."receipt_category" AS ENUM('fuel', 'parking', 'tolls', 'repairs', 'service', 'other');--> statement-breakpoint
CREATE TYPE "public"."receipt_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'driver');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('A', 'B');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"changes" jsonb,
	"performed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid,
	"name" varchar(200) NOT NULL,
	"email" varchar(200),
	"username" varchar(100),
	"phone" varchar(50),
	"role" "role" DEFAULT 'driver' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drivers_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "drivers_email_unique" UNIQUE("email"),
	CONSTRAINT "drivers_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"inspection_type" "inspection_type" NOT NULL,
	"date" date NOT NULL,
	"next_due_date" date NOT NULL,
	"result" "inspection_result",
	"performed_by" varchar(200),
	"notes" text,
	"avvikelse" text,
	"document_url" varchar(500),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mileage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"mileage" integer NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"logged_by" uuid,
	"source" "mileage_source" DEFAULT 'manual' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"author_id" uuid,
	"content" text NOT NULL,
	"tag" "note_tag" DEFAULT 'general' NOT NULL,
	"photo_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"vehicle_id" uuid,
	"category" "receipt_category" NOT NULL,
	"amount" numeric(10, 2),
	"notes" text,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"status" "receipt_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"service_type" "service_type" NOT NULL,
	"date" date NOT NULL,
	"mileage_at_service" integer NOT NULL,
	"performed_by" varchar(200),
	"cost_sek" numeric(10, 2),
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(200) DEFAULT '' NOT NULL,
	"organisationsnummer" varchar(50) DEFAULT '' NOT NULL,
	"contact_email" varchar(200),
	"service_interval_a" integer DEFAULT 15000 NOT NULL,
	"service_interval_b" integer DEFAULT 30000 NOT NULL,
	"notify_email_enabled" boolean DEFAULT false NOT NULL,
	"notify_overdue_service" boolean DEFAULT false NOT NULL,
	"notify_email" varchar(200),
	"warning_threshold_days" integer DEFAULT 30 NOT NULL,
	"email_digest_frequency" varchar(20) DEFAULT 'weekly' NOT NULL,
	"language" varchar(10) DEFAULT 'sv' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unassigned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_number" varchar(10) NOT NULL,
	"vin" varchar(20),
	"make" varchar(100),
	"model" varchar(100),
	"model_year" integer,
	"color" varchar(50),
	"fuel_type" varchar(50),
	"has_taxameter" boolean DEFAULT true,
	"equipment_type" "equipment_type" DEFAULT 'taxameter',
	"taxameter_make" varchar(100),
	"taxameter_type" varchar(100),
	"taxameter_serial" varchar(100),
	"redovisningscentral" varchar(200),
	"current_mileage" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"api_raw_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_registration_number_unique" UNIQUE("registration_number")
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_performed_by_drivers_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_created_by_drivers_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mileage_logs" ADD CONSTRAINT "mileage_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mileage_logs" ADD CONSTRAINT "mileage_logs_logged_by_drivers_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_drivers_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_reviewed_by_drivers_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_events" ADD CONSTRAINT "service_events_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_events" ADD CONSTRAINT "service_events_created_by_drivers_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;