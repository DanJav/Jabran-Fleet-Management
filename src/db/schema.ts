import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  text,
  timestamp,
  date,
  decimal,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["admin", "driver"]);
export const equipmentTypeEnum = pgEnum("equipment_type", ["taxameter", "suft", "none"]);
export const serviceTypeEnum = pgEnum("service_type", ["A", "B"]);
export const inspectionTypeEnum = pgEnum("inspection_type", ["besiktning", "taxameter", "suft"]);
export const inspectionResultEnum = pgEnum("inspection_result", [
  "approved",
  "approved_with_notes",
  "failed",
]);
export const mileageSourceEnum = pgEnum("mileage_source", ["manual", "api"]);
export const noteTagEnum = pgEnum("note_tag", ["issue", "maintenance", "general"]);

// Vehicles
export const vehicles = pgTable("vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  registrationNumber: varchar("registration_number", { length: 10 }).unique().notNull(),
  vin: varchar("vin", { length: 20 }),
  make: varchar("make", { length: 100 }),
  model: varchar("model", { length: 100 }),
  modelYear: integer("model_year"),
  color: varchar("color", { length: 50 }),
  fuelType: varchar("fuel_type", { length: 50 }),
  hasTaxameter: boolean("has_taxameter").default(true),
  equipmentType: equipmentTypeEnum("equipment_type").default("taxameter"),
  taxameterMake: varchar("taxameter_make", { length: 100 }),
  taxameterType: varchar("taxameter_type", { length: 100 }),
  taxameterSerial: varchar("taxameter_serial", { length: 100 }),
  redovisningscentral: varchar("redovisningscentral", { length: 200 }),
  currentMileage: integer("current_mileage").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  apiRawData: jsonb("api_raw_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Drivers
export const drivers = pgTable("drivers", {
  id: uuid("id").defaultRandom().primaryKey(),
  authUserId: uuid("auth_user_id").unique(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).unique(),
  username: varchar("username", { length: 100 }).unique(),
  phone: varchar("phone", { length: 50 }),
  role: roleEnum("role").default("driver").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Vehicle Assignments
export const vehicleAssignments = pgTable("vehicle_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .references(() => vehicles.id)
    .notNull(),
  driverId: uuid("driver_id")
    .references(() => drivers.id)
    .notNull(),
  isPrimary: boolean("is_primary").default(true).notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  unassignedAt: timestamp("unassigned_at", { withTimezone: true }),
});

// Mileage Logs
export const mileageLogs = pgTable("mileage_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .references(() => vehicles.id)
    .notNull(),
  mileage: integer("mileage").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow().notNull(),
  loggedBy: uuid("logged_by").references(() => drivers.id),
  source: mileageSourceEnum("source").default("manual").notNull(),
  notes: text("notes"),
});

// Service Events
export const serviceEvents = pgTable("service_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .references(() => vehicles.id)
    .notNull(),
  serviceType: serviceTypeEnum("service_type").notNull(),
  date: date("date").notNull(),
  mileageAtService: integer("mileage_at_service").notNull(),
  performedBy: varchar("performed_by", { length: 200 }),
  costSek: decimal("cost_sek", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => drivers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Inspections
export const inspections = pgTable("inspections", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .references(() => vehicles.id)
    .notNull(),
  inspectionType: inspectionTypeEnum("inspection_type").notNull(),
  date: date("date").notNull(),
  nextDueDate: date("next_due_date").notNull(),
  result: inspectionResultEnum("result"),
  performedBy: varchar("performed_by", { length: 200 }),
  notes: text("notes"),
  avvikelse: text("avvikelse"),
  documentUrl: varchar("document_url", { length: 500 }),
  createdBy: uuid("created_by").references(() => drivers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Notes
export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .references(() => vehicles.id)
    .notNull(),
  authorId: uuid("author_id").references(() => drivers.id),
  content: text("content").notNull(),
  tag: noteTagEnum("tag").default("general").notNull(),
  photoUrl: varchar("photo_url", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Activity Log
export const activityLog = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  changes: jsonb("changes"),
  performedBy: uuid("performed_by").references(() => drivers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Settings (singleton row for app config)
export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyName: varchar("company_name", { length: 200 }).default("").notNull(),
  organisationsnummer: varchar("organisationsnummer", { length: 50 }).default("").notNull(),
  contactEmail: varchar("contact_email", { length: 200 }),
  serviceIntervalA: integer("service_interval_a").default(15000).notNull(),
  serviceIntervalB: integer("service_interval_b").default(30000).notNull(),
  notifyEmailEnabled: boolean("notify_email_enabled").default(false).notNull(),
  notifyOverdueService: boolean("notify_overdue_service").default(false).notNull(),
  notifyEmail: varchar("notify_email", { length: 200 }),
  warningThresholdDays: integer("warning_threshold_days").default(30).notNull(),
  emailDigestFrequency: varchar("email_digest_frequency", { length: 20 }).default("weekly").notNull(),
  language: varchar("language", { length: 10 }).default("sv").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Settings = typeof settings.$inferSelect;

// Type exports
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Driver = typeof drivers.$inferSelect;
export type NewDriver = typeof drivers.$inferInsert;
export type VehicleAssignment = typeof vehicleAssignments.$inferSelect;
export type MileageLog = typeof mileageLogs.$inferSelect;
export type ServiceEvent = typeof serviceEvents.$inferSelect;
export type Inspection = typeof inspections.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
