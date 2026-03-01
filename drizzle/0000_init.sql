-- TaxiFleet Database Schema
-- Run this SQL in Supabase SQL Editor to initialize the database

-- Enums
CREATE TYPE role AS ENUM ('admin', 'driver');
CREATE TYPE equipment_type AS ENUM ('taxameter', 'suft', 'none');
CREATE TYPE service_type AS ENUM ('A', 'B');
CREATE TYPE inspection_type AS ENUM ('besiktning', 'taxameter', 'suft');
CREATE TYPE inspection_result AS ENUM ('approved', 'approved_with_notes', 'failed');
CREATE TYPE mileage_source AS ENUM ('manual', 'api');
CREATE TYPE note_tag AS ENUM ('issue', 'maintenance', 'general');

-- Vehicles
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number VARCHAR(10) UNIQUE NOT NULL,
  vin VARCHAR(20),
  make VARCHAR(100),
  model VARCHAR(100),
  model_year INTEGER,
  color VARCHAR(50),
  fuel_type VARCHAR(50),
  has_taxameter BOOLEAN DEFAULT true,
  equipment_type equipment_type DEFAULT 'taxameter',
  taxameter_make VARCHAR(100),
  taxameter_type VARCHAR(100),
  taxameter_serial VARCHAR(100),
  redovisningscentral VARCHAR(200),
  current_mileage INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  api_raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drivers
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  phone VARCHAR(50),
  role role NOT NULL DEFAULT 'driver',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vehicle Assignments
CREATE TABLE vehicle_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  is_primary BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ
);

-- Mileage Logs
CREATE TABLE mileage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  mileage INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logged_by UUID REFERENCES drivers(id),
  source mileage_source NOT NULL DEFAULT 'manual',
  notes TEXT
);

-- Service Events
CREATE TABLE service_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  service_type service_type NOT NULL,
  date DATE NOT NULL,
  mileage_at_service INTEGER NOT NULL,
  performed_by VARCHAR(200),
  cost_sek DECIMAL(10,2),
  notes TEXT,
  created_by UUID REFERENCES drivers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inspections
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  inspection_type inspection_type NOT NULL,
  date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  result inspection_result,
  performed_by VARCHAR(200),
  notes TEXT,
  avvikelse TEXT,
  document_url VARCHAR(500),
  created_by UUID REFERENCES drivers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notes
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  author_id UUID REFERENCES drivers(id),
  content TEXT NOT NULL,
  tag note_tag NOT NULL DEFAULT 'general',
  photo_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity Log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  changes JSONB,
  performed_by UUID REFERENCES drivers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_vehicles_registration ON vehicles(registration_number);
CREATE INDEX idx_vehicles_active ON vehicles(is_active);
CREATE INDEX idx_vehicle_assignments_vehicle ON vehicle_assignments(vehicle_id);
CREATE INDEX idx_vehicle_assignments_driver ON vehicle_assignments(driver_id);
CREATE INDEX idx_vehicle_assignments_active ON vehicle_assignments(vehicle_id, driver_id) WHERE unassigned_at IS NULL;
CREATE INDEX idx_mileage_logs_vehicle ON mileage_logs(vehicle_id);
CREATE INDEX idx_service_events_vehicle ON service_events(vehicle_id);
CREATE INDEX idx_service_events_type ON service_events(vehicle_id, service_type);
CREATE INDEX idx_inspections_vehicle ON inspections(vehicle_id);
CREATE INDEX idx_inspections_type ON inspections(vehicle_id, inspection_type);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Row Level Security (RLS)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- For now, allow authenticated users full access (app-level auth handles role checks)
-- In production, add granular RLS policies per role
CREATE POLICY "Allow authenticated access" ON vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON drivers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON vehicle_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON mileage_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON service_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow service_role full access (for API routes using service key)
CREATE POLICY "Allow service role access" ON vehicles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON drivers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON vehicle_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON mileage_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON service_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON inspections FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON notes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role access" ON activity_log FOR ALL TO service_role USING (true) WITH CHECK (true);
