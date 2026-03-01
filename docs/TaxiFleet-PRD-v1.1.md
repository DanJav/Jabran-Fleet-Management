# PRD: TaxiFleet — Fleet Service Manager & Overview Platform

**Author:** Dan
**Date:** 2026-03-01
**Status:** Draft
**Version:** 1.0
**Taskmaster Optimized:** Yes

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Goals & Success Metrics](#goals--success-metrics)
4. [User Stories](#user-stories)
5. [Functional Requirements](#functional-requirements)
6. [Non-Functional Requirements](#non-functional-requirements)
7. [Technical Considerations](#technical-considerations)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Out of Scope](#out-of-scope)
10. [Open Questions & Risks](#open-questions--risks)
11. [Validation Checkpoints](#validation-checkpoints)
12. [Appendix: Task Breakdown Hints](#appendix-task-breakdown-hints)

---

## Executive Summary

TaxiFleet is a fleet service management platform for a Swedish taxi company operating ~15 vehicles (designed to support up to 50 vehicles with no performance degradation). It replaces manual spreadsheet-based tracking of vehicle inspections (besiktning), taximeter inspections, service intervals, and driver assignments with a real-time web application. The platform auto-calculates upcoming service deadlines (Service A every 15,000 km, Service B every 30,000 km), flags overdue inspections, integrates Swedish vehicle registry data via license plate lookup, and provides role-separated views for admin (full fleet overview, dashboards, alerts) and drivers (limited to their assigned vehicles). The design follows the Linear/Attio/Notion aesthetic: clean, monochrome-first, keyboard-navigable, with Radix UI primitives.

---

## Problem Statement

### Current Situation

Fleet data is managed in Excel spreadsheets containing registration numbers, inspection dates, taxameter details, and redovisningscentral assignments. There is no automated calculation of upcoming deadlines, no alerting system for overdue inspections, no driver self-service, and no centralized service history log. The admin must manually cross-reference dates, calculate mileage-based service intervals, and chase drivers for updates.

### User Impact

- **Fleet admin (owner):** Spends significant time manually tracking 15 vehicles across multiple compliance domains — vehicle inspection (yearly besiktning via Transportstyrelsen), taximeter inspection (yearly per STAFS 2022:3/Swedac requirements), and mileage-based service intervals. Risk of missed deadlines leading to regulatory penalties.
- **Drivers:** No visibility into their vehicle's compliance status. Cannot self-report mileage or flag issues without calling/texting admin. No accountability trail.

### Business Impact

- **Regulatory risk:** Swedish law requires annual vehicle inspection (besiktning) and annual taxameter inspection (TSFS 2013:41, Taxitrafikförordning §3). Missing these can result in fines (penningböter), vehicle seizure, or taxi license revocation by Transportstyrelsen.
- **Operational risk:** Missed Service A/B intervals lead to higher repair costs, vehicle downtime, and potential safety issues.
- **Time cost:** Manual tracking across spreadsheets for 15 vehicles × 4 compliance domains = substantial admin overhead that grows linearly with fleet size.

### Why Solve This Now?

The fleet is at a size (~15 vehicles) where manual tracking is becoming unreliable. One missed taxameter inspection can trigger an "utebliven överföring" flag at the redovisningscentral (already seen for vehicle BOP02K in the current data), which Transportstyrelsen monitors and can use to revoke the taxi license. A purpose-built system pays for itself in avoided penalties and admin time.

---

## Goals & Success Metrics

### Goal 1: Zero Missed Compliance Deadlines

- **Description:** Eliminate missed or overdue inspections and taxameter checks across the fleet.
- **Metric:** Number of overdue inspection events per quarter.
- **Baseline:** Unknown (manual tracking, likely 1-3 near-misses per quarter).
- **Target:** 0 overdue events per quarter.
- **Timeframe:** Within 1 quarter of launch.
- **Measurement:** Platform alert logs + inspection completion records.

### Goal 2: Reduce Admin Fleet Management Time by 75%

- **Description:** Automate mileage-based service scheduling, inspection countdown, and driver communication.
- **Metric:** Hours per week spent on fleet administration.
- **Baseline:** Estimated 4-6 hours/week.
- **Target:** <1 hour/week (dashboard review + exception handling only).
- **Timeframe:** Immediate on launch.
- **Measurement:** Self-reported time tracking.

### Goal 3: Complete Digital Service History

- **Description:** Build an auditable log of every service, inspection, and mileage reading per vehicle.
- **Metric:** % of fleet events captured digitally.
- **Baseline:** 0% (spreadsheet-only, no history).
- **Target:** 100% of events logged from launch onward.
- **Timeframe:** Ongoing from launch.
- **Measurement:** Audit of service_logs table vs real-world events.

### Goal 4: Driver Self-Service Adoption

- **Description:** Drivers actively use the platform to report mileage, view schedules, and log notes.
- **Metric:** % of drivers logging in at least weekly.
- **Baseline:** 0%.
- **Target:** 80%+ within 2 months of launch.
- **Timeframe:** 2 months post-launch.
- **Measurement:** Login analytics.

---

## User Stories

### Story 1: Fleet Dashboard Overview

**As an** admin,
**I want to** see a single dashboard showing all vehicles with their compliance status at a glance,
**So that I can** immediately identify which vehicles need attention.

**Acceptance Criteria:**
- [ ] Dashboard shows all vehicles in a table/list with sortable columns: reg number, make/model, driver, current mileage, next service (type + km remaining), next besiktning (date + days remaining), next taxameter inspection (date + days remaining), status indicator.
- [ ] Status indicator uses color coding: green (>30 days / >3000 km), yellow (≤30 days / ≤3000 km), red (overdue).
- [ ] Clicking a vehicle row navigates to the full vehicle detail view.
- [ ] Dashboard auto-refreshes or updates on navigation.
- [ ] Top-level summary cards show: total vehicles, vehicles needing attention (yellow+red), overdue count, next upcoming deadline across fleet.

### Story 2: Vehicle Detail & Service Tracking

**As an** admin,
**I want to** view a vehicle's complete profile including calculated next service dates,
**So that I can** plan maintenance proactively.

**Acceptance Criteria:**
- [ ] Vehicle detail shows: registration number, VIN, make, model, year, color, fuel type, current mileage (from last reading).
- [ ] Service section shows: last Service A (date + mileage), next Service A (calculated: last_service_A_mileage + 15,000), last Service B (date + mileage), next Service B (calculated: last_service_B_mileage + 30,000), km remaining until each.
- [ ] Inspection section shows: last besiktning date, next besiktning date (last + 12 months), days remaining, status.
- [ ] Taximeter section shows: has taxameter (yes/no), make, type, serial number, redovisningscentral, last taxameter inspection date, next taxameter inspection (last + 12 months), days remaining, status, any avvikelser (deviations).
- [ ] Full service log timeline showing all historical events.
- [ ] Button to "Log Service", "Log Mileage", "Log Inspection" with date + notes + who performed it.

### Story 3: Add Vehicle via License Plate Lookup

**As an** admin,
**I want to** add a new vehicle by entering its Swedish registration number and have vehicle data auto-populated,
**So that I** don't have to manually enter make, model, year, etc.

**Acceptance Criteria:**
- [ ] Input field accepts Swedish registration number format (ABC123 or ABC12A).
- [ ] On submit, system calls vehicle data API (Merinfo.se scraping or Biluppgifter.se API or Registreringsnummerapi.se) and populates: make, model, year, color, fuel type, VIN, last known inspection date and mileage.
- [ ] Admin reviews auto-filled data and can edit before saving.
- [ ] If API call fails or returns no data, admin can manually fill all fields.
- [ ] Fallback chain: Merinfo.se → Registreringsnummerapi.se → Biluppgifter.se → manual entry.

### Story 4: Driver View — My Vehicles

**As a** driver,
**I want to** see only the vehicle(s) assigned to me with their current status,
**So that I** know if anything needs attention before I drive.

**Acceptance Criteria:**
- [ ] Driver sees only their assigned vehicle(s) after login.
- [ ] Driver can view: current mileage, next service info, next inspection dates, any notes from admin.
- [ ] Driver can: update current mileage, add a note (e.g., "strange noise from front left"), report an issue.
- [ ] Driver CANNOT: view other vehicles, access admin dashboard, delete records, change vehicle assignments, or modify historical records.
- [ ] Driver sees a clear alert banner if any compliance item is overdue or due within 14 days.

### Story 5: Mileage Logging & Service Calculation

**As a** driver or admin,
**I want to** log the current odometer reading,
**So that** the system can calculate when the next service is due.

**Acceptance Criteria:**
- [ ] Mileage input validates: must be ≥ last recorded mileage (cannot go backwards).
- [ ] On save, system recalculates: km remaining to Service A, km remaining to Service B.
- [ ] Service A calculation: next_service_A = last_service_A_mileage + 15,000. If current mileage > next_service_A, status = overdue.
- [ ] Service B calculation: next_service_B = last_service_B_mileage + 30,000. If current mileage > next_service_B, status = overdue.
- [ ] Note: Service A and Service B are independent cycles. Logging a Service B does NOT reset the Service A counter. They run on separate mileage clocks.
- [ ] Mileage history is stored as a log with timestamp + who logged it.

### Story 6: Inspection Management

**As an** admin,
**I want to** record when a vehicle inspection (besiktning) or taxameter inspection is completed,
**So that** the next deadline auto-calculates.

**Acceptance Criteria:**
- [ ] Admin can log: inspection type (besiktning / taxameter), date performed, performed by (organization/person), result (approved / approved with notes / failed), notes, attached documents (photo of report).
- [ ] On save, next inspection date auto-calculates: inspection_date + 12 months.
- [ ] For taxameter inspections, capture: serial number verified, redovisningscentral confirmed, any avvikelser.
- [ ] Historical inspection log per vehicle showing all past inspections.

### Story 7: Notifications & Alerts

**As an** admin,
**I want to** receive proactive alerts when compliance deadlines approach,
**So that I** never miss a deadline.

**Acceptance Criteria:**
- [ ] Alert thresholds configurable per type: default 60 days, 30 days, 14 days, 7 days for date-based; 5000 km, 3000 km, 1000 km for mileage-based.
- [ ] In-app notification bell with unread count.
- [ ] Optional email digest: daily or weekly summary of upcoming deadlines.
- [ ] Dashboard homepage prioritizes vehicles needing attention at the top.

### Story 8: Driver Management

**As an** admin,
**I want to** assign drivers to vehicles and manage driver accounts,
**So that** drivers see the right vehicles and I can track who's responsible.

**Acceptance Criteria:**
- [ ] Admin can create driver accounts (name, email, phone).
- [ ] Admin can assign one or more vehicles to a driver. A vehicle can have one primary driver and optional secondary drivers.
- [ ] Admin can deactivate driver accounts (does not delete history).
- [ ] Driver assignment history is logged per vehicle.

### Story 9: Bulk Import Existing Data

**As an** admin,
**I want to** import my existing Excel data on first setup,
**So that I** don't have to re-enter 15 vehicles manually.

**Acceptance Criteria:**
- [ ] Support import from .xlsx file matching the current spreadsheet format.
- [ ] Map columns: Registreringsnummer, Besiktningsdatum, Nästa besiktning, Redovisningscentral, Taxameter Serienummer, Taxameter Fabrikat, Taxameter Typ, Taxameter Besiktad, SUFT Kontrollerad, Avvikelse, Övrigt.
- [ ] Validation step showing parsed data before committing.
- [ ] Error handling for duplicate reg numbers, invalid dates, missing required fields.

---

## Functional Requirements

### REQ-001: Vehicle Registry — Priority: P0 (Critical)

- Store per vehicle: registration_number (unique), VIN, make, model, model_year, color, fuel_type, has_taxameter (boolean), taxameter_make, taxameter_type, taxameter_serial_number, redovisningscentral, current_mileage, created_at, updated_at.
- Vehicle can be marked as active/inactive (sold, scrapped, not in taxi service).

### REQ-002: Service Tracking Engine — Priority: P0 (Critical)

- Store service events: vehicle_id, service_type (A | B), date, mileage_at_service, performed_by, cost (optional), notes, created_by.
- Calculation logic:
  - **Service A interval:** 15,000 km. Next Service A = last_service_A_mileage + 15,000. Tracked independently.
  - **Service B interval:** 30,000 km. Next Service B = last_service_B_mileage + 30,000. Tracked independently.
  - **Service A and B are independent cycles.** Logging a Service B does NOT reset the Service A counter. They run on separate mileage clocks.
  - **Status:** `upcoming` (>3000 km remaining), `due_soon` (≤3000 km remaining), `overdue` (current mileage exceeded next service mileage).

### REQ-003: Inspection Tracking — Priority: P0 (Critical)

- Store inspection events: vehicle_id, inspection_type (besiktning | taxameter | suft), date, next_due_date (auto: date + 12 months), result, performed_by, notes, document_url, created_by.
- Auto-calculate next due date on creation.
- Track avvikelser (deviations) specifically for taxameter inspections.

### REQ-004: Mileage Log — Priority: P0 (Critical)

- Store readings: vehicle_id, mileage, date, logged_by, source (manual | api).
- Enforce monotonically increasing mileage per vehicle.
- Each new reading triggers service status recalculation.

### REQ-005: Vehicle Data API Integration — Priority: P1 (Important)

- On vehicle creation, accept Swedish registration number and call external API to populate vehicle details.
- Primary API (MVP): Merinfo.se (confirmed working, rich data including make, model, VIN, inspection history with mileage). B2B API via contact, or server-side scraping with caching for MVP.
- Secondary API: Registreringsnummerapi.se (SOAP webservice, 2 SEK/lookup, free 10-lookup trial). Low-friction onboarding (10 free lookups, no sales call needed).
- Production API: Biluppgifter.se API (most comprehensive, paid, REST/JSON, batch support). Contact sales for API key.
- Additional options: Fordonsfakta.se (fleet-focused, Transportstyrelsen Direktåkomst data), Transportstyrelsen scraper (open-source Node.js wrapper on GitHub).
- Store raw API response for audit. Only auto-fill fields, never auto-save without admin review.

### REQ-006: Role-Based Access Control — Priority: P0 (Critical)

- **Admin role:** Full CRUD on all entities. Access to dashboard, all vehicles, all drivers, settings, import/export.
- **Driver role:** Read-only on assigned vehicles. Can: log mileage, add notes/issues. Cannot: view other vehicles, access dashboard, modify historical data, manage drivers.
- Auth: email + password via Supabase Auth. Magic link can be added later as UX improvement.

### REQ-007: Dashboard & Reporting (Admin only) — Priority: P0 (Critical)

- **Fleet overview:** Vehicle count, active/inactive, compliance summary.
- **Attention needed:** Vehicles sorted by urgency (overdue first, then due_soon).
- **Timeline view:** Upcoming deadlines across fleet on a timeline/calendar.
- **Per-vehicle cards:** Registration number, make/model thumbnail, status badges for besiktning/taxameter/service.
- **Export:** Download fleet status as PDF or CSV at any point.

### REQ-008: Notes & Activity Log — Priority: P1 (Important)

- Every entity change logged as an activity event: what changed, who changed it, when, old/new values.
- Free-form notes can be attached to any vehicle by admin or driver.
- Notes support: text, optional photo attachment, tags (issue, maintenance, general).

### REQ-009: Bulk Data Import — Priority: P1 (Important)

- Accept .xlsx upload matching the schema from the existing spreadsheet.
- Column mapping UI to handle variations in column names.
- Preview → confirm → import workflow.
- Generate import report: X vehicles imported, Y skipped (with reasons).

---

## Non-Functional Requirements

### NFR-001: Performance

- Dashboard load time: <1 second for fleet of up to 50 vehicles.
- Vehicle detail page: <500ms.
- API vehicle lookup: <3 seconds (dependent on external API).

### NFR-002: Responsiveness — Mobile-First Driver Experience

- **Mobile-first design for driver view:** All driver interactions (mileage logging, viewing status, adding notes) must be fully functional and optimized for mobile screens. Touch-friendly tap targets (minimum 44px), large input fields, bottom-sheet modals for actions.
- **Responsive admin view:** Full functionality on desktop (primary use case for admin). Usable on tablet; critical actions accessible on mobile.
- Breakpoints: 375px (mobile, driver-primary), 640px (large mobile), 768px (tablet), 1024px (desktop), 1280px+ (large desktop).
- All tables collapse to card layouts on mobile. Forms use full-width inputs on mobile.
- No horizontal scrolling on any viewport.
- PWA-ready: Add to Home Screen support for drivers (manifest.json, service worker for offline mileage logging).

### NFR-003: Security

- HTTPS everywhere.
- Password hashing (bcrypt/argon2).
- Session-based or JWT auth.
- Rate limiting on login and API endpoints.
- No vehicle data exposed to unauthenticated users.

### NFR-004: Data Integrity

- All mileage entries must be monotonically increasing per vehicle.
- All dates validated (no future inspection dates unless explicitly "scheduled").
- Soft deletes only — no hard deletion of vehicles or service records.
- Audit trail for all mutations.

### NFR-005: Localization

- Primary language: Swedish.
- UI labels, date formats (YYYY-MM-DD per Swedish convention), number formats (1 000 km, not 1,000 km).
- Support for English as secondary language (toggle in settings).

### NFR-006: Availability

- Target 99.5% uptime.
- Deployment: Vercel (frontend/API) + Supabase (database/auth/storage). Both offer generous free tiers suitable for MVP fleet size.

---

## Technical Considerations

### Architecture

**Recommended stack:**

- **Frontend:** Next.js 14+ (App Router) with React Server Components.
- **UI framework:** Radix UI primitives + Tailwind CSS. Follow Linear/Attio design system: monochrome base palette (gray-900 to gray-50), single accent color (blue or violet), SF Pro / Geist / Inter typeface, 4px grid system, subtle borders (1px, gray-200), micro-interactions on hover/focus.
- **Backend:** Next.js API routes (or separate Express/Fastify if preferred).
- **Database:** PostgreSQL via Supabase (managed, includes auth, storage, realtime).
- **ORM:** Drizzle ORM or Prisma.
- **Auth:** Supabase Auth with email + password provider (leverages built-in Supabase auth instead of NextAuth for tighter integration).
- **File storage:** Supabase Storage (S3-compatible) for document uploads (inspection reports, photos).
- **Deployment:** Vercel (frontend + API routes) + Supabase (database + auth + storage).

### Data Model (Core Entities)

```
vehicles
  id              UUID PK
  registration_number  VARCHAR UNIQUE NOT NULL  -- e.g. "ZAS71A"
  vin             VARCHAR
  make            VARCHAR  -- e.g. "Volvo"
  model           VARCHAR  -- e.g. "V60 D4"
  model_year      INTEGER
  color           VARCHAR
  fuel_type       VARCHAR
  has_taxameter   BOOLEAN DEFAULT true
  equipment_type  ENUM('taxameter', 'suft', 'none') DEFAULT 'taxameter'  -- traditional taxameter vs SUFT (2021 law)
  taxameter_make  VARCHAR  -- e.g. "MegTax", "Digitax"
  taxameter_type  VARCHAR  -- e.g. "MT310 (516504)", "F1+MS (SC0039-16)"
  taxameter_serial VARCHAR -- e.g. "XO006492"
  redovisningscentral VARCHAR -- e.g. "STRUCTAB AKTIEBOLAG"
  current_mileage INTEGER DEFAULT 0
  is_active       BOOLEAN DEFAULT true
  notes           TEXT
  api_raw_data    JSONB    -- raw response from vehicle lookup API
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

drivers
  id              UUID PK
  name            VARCHAR NOT NULL
  email           VARCHAR UNIQUE NOT NULL
  phone           VARCHAR
  role            ENUM('admin', 'driver') DEFAULT 'driver'
  is_active       BOOLEAN DEFAULT true
  created_at      TIMESTAMPTZ

vehicle_assignments
  id              UUID PK
  vehicle_id      UUID FK -> vehicles
  driver_id       UUID FK -> drivers
  is_primary      BOOLEAN DEFAULT true
  assigned_at     TIMESTAMPTZ
  unassigned_at   TIMESTAMPTZ NULL

mileage_logs
  id              UUID PK
  vehicle_id      UUID FK -> vehicles
  mileage         INTEGER NOT NULL
  logged_at       TIMESTAMPTZ NOT NULL
  logged_by       UUID FK -> drivers
  source          ENUM('manual', 'api') DEFAULT 'manual'
  notes           TEXT

service_events
  id              UUID PK
  vehicle_id      UUID FK -> vehicles
  service_type    ENUM('A', 'B') NOT NULL
  date            DATE NOT NULL
  mileage_at_service INTEGER NOT NULL
  performed_by    VARCHAR
  cost_sek        DECIMAL(10,2)
  notes           TEXT
  created_by      UUID FK -> drivers

inspections
  id              UUID PK
  vehicle_id      UUID FK -> vehicles
  inspection_type ENUM('besiktning', 'taxameter', 'suft') NOT NULL
  date            DATE NOT NULL
  next_due_date   DATE NOT NULL  -- auto: date + INTERVAL '12 months'
  result          ENUM('approved', 'approved_with_notes', 'failed')
  performed_by    VARCHAR
  notes           TEXT
  avvikelse       TEXT  -- deviations, relevant for taxameter
  document_url    VARCHAR
  created_by      UUID FK -> drivers

notes
  id              UUID PK
  vehicle_id      UUID FK -> vehicles
  author_id       UUID FK -> drivers
  content         TEXT NOT NULL
  tag             ENUM('issue', 'maintenance', 'general') DEFAULT 'general'
  photo_url       VARCHAR
  created_at      TIMESTAMPTZ

activity_log
  id              UUID PK
  entity_type     VARCHAR  -- 'vehicle', 'service_event', 'inspection', etc.
  entity_id       UUID
  action          VARCHAR  -- 'created', 'updated', 'deleted'
  changes         JSONB    -- {field: {old: X, new: Y}}
  performed_by    UUID FK -> drivers
  created_at      TIMESTAMPTZ
```

### Service Calculation Logic (Pseudocode)

```
function calculateServiceStatus(vehicle):
  currentMileage = vehicle.current_mileage
  
  // Get last Service A and Service B events (independent cycles)
  lastServiceA = getLastServiceEvent(vehicle.id, type='A')
  lastServiceB = getLastServiceEvent(vehicle.id, type='B')
  
  // Service A: every 15,000 km from last Service A only (independent)
  nextServiceA_mileage = (lastServiceA?.mileage_at_service ?? 0) + 15000
  kmToServiceA = nextServiceA_mileage - currentMileage
  
  // Service B: every 30,000 km from last Service B only (independent)
  nextServiceB_mileage = (lastServiceB?.mileage_at_service ?? 0) + 30000
  kmToServiceB = nextServiceB_mileage - currentMileage
  
  return {
    serviceA: {
      next_at_km: nextServiceA_mileage,
      km_remaining: max(0, kmToServiceA),
      status: kmToServiceA <= 0 ? 'overdue' 
            : kmToServiceA <= 3000 ? 'due_soon' 
            : 'upcoming'
    },
    serviceB: {
      next_at_km: nextServiceB_mileage,
      km_remaining: max(0, kmToServiceB),
      status: kmToServiceB <= 0 ? 'overdue' 
            : kmToServiceB <= 3000 ? 'due_soon' 
            : 'upcoming'
    }
  }
```

### External API Integration

**Priority order for vehicle lookup:**

1. **Merinfo.se** — Confirmed working. Rich data: make, model, year, color, VIN, inspection history with mileage at each inspection, owner info, tax status, technical specs (engine, fuel, dimensions). Public web pages fetchable at `https://www.merinfo.se/fordon/{slug}`. B2B API available via contact (info@merinfo.se). Data sourced from Transportstyrelsen, updated weekly.

2. **Biluppgifter.se API** — Sweden's largest vehicle data provider (15M+ vehicles). REST/JSON API returns make, model, year, color, VIN, inspection data, technical specs, owner history. Requires paid API key (contact sales). Well-documented at `apidocs.biluppgifter.se`. Supports batch lookups by registration number or VIN. Best option for production at scale.

3. **Fordonsfakta.se** — Run by Fordonskontroll Sverige AB, specifically designed for fleet management. API provides direct access to Transportstyrelsen Direktåkomst data: vehicle status, inspection dates, registration info. Contact for API access.

4. **Registreringsnummerapi.se** — SOAP webservice covering Sweden, Norway, Finland, Denmark + more. Free trial (10 lookups), then 2 SEK/lookup in blocks of 100+. Low-friction onboarding: 10 free lookups, no sales call needed.

5. **Transportstyrelsen Fordonsuppgifter** — Official source at `fu-regnr.transportstyrelsen.se/extweb/`. No public REST API, but an open-source Node.js scraper exists (`philipgyllhamn/fordonsuppgifter-api-wrapper` on GitHub) that extracts vehicle details by registration plate. Suitable as a free fallback but fragile (scraping).

6. **car.info** — Web scraping fallback. Pages at `https://www.car.info/sv-se/license-plate/S/{REG_NUMBER}`. Rate limited (429 errors observed). Use with server-side caching and backoff. Last resort only.

**Recommended strategy:** Start with Merinfo.se web scraping + Registreringsnummerapi.se (both verified working, low cost) for MVP. Migrate to Biluppgifter.se API for production — their fleet management use case and batch lookups make it the best long-term fit.

**Data mapping from Merinfo.se → vehicle record:**
```
Merinfo field                  → DB field
Fabrikat                       → make (e.g. "Toyota")
Modell                         → model (e.g. "Corolla")
Fordonsår / Modellår           → model_year
Färg                           → color (e.g. "Svart")
Drivmedel                      → fuel_type (e.g. "Bensin")
Chassinr / VIN                 → vin
Senast besiktigad              → used to create initial inspection record
Mätarställning (besiktning)    → current_mileage (converted from mil to km: × 10)
Nästa besiktning senast        → used for next inspection due date
```

**Note on Swedish mileage units:** Merinfo.se and Swedish besiktning records report mileage in "mil" (Scandinavian miles = 10 km). The platform stores and displays mileage in **km**. All imported mileage values from Swedish sources must be multiplied by 10.

### Design System Specification

Following Linear/Attio/Notion aesthetic:

**Color palette:**
```css
--gray-1: #fcfcfc;    /* Background */
--gray-2: #f9f9f9;    /* Subtle background */
--gray-3: #f0f0f0;    /* UI element background */
--gray-4: #e8e8e8;    /* Hovered UI element */
--gray-5: #e0e0e0;    /* Active UI element */
--gray-6: #d9d9d9;    /* Subtle borders */
--gray-7: #cecece;    /* UI element border */
--gray-8: #bbbbbb;    /* Hovered border */
--gray-9: #8d8d8d;    /* Solid backgrounds */
--gray-10: #838383;   /* Hovered solid */
--gray-11: #646464;   /* Low-contrast text */
--gray-12: #202020;   /* High-contrast text */

--accent: #6e56cf;    /* Violet accent — Radix violet-9 */
--accent-light: #7c66dc;

--success: #30a46c;   /* Green for "OK/upcoming" */
--warning: #f5a623;   /* Amber for "due soon" */
--danger: #e5484d;    /* Red for "overdue" */
```

**Typography:**
```css
--font-sans: 'Geist', -apple-system, system-ui, sans-serif;
--font-mono: 'Geist Mono', 'SF Mono', monospace;
```

**Layout principles:**
- Sidebar navigation (collapsible), 240px wide.
- Content area: max-width 1200px, centered.
- Tables: borderless rows with subtle row hover (gray-3), compact 40px row height.
- Cards: 1px border (gray-6), 8px border-radius, 16-24px padding.
- Status badges: small pill shapes with colored dot + text.
- Modals/drawers: slide-in from right for detail views (like Linear's issue detail). On mobile, use full-screen bottom sheets.
- Command palette: ⌘K for instant vehicle search (<200ms response), navigation. Hidden on mobile (use search bar instead).

**Mobile-specific patterns (driver view):**
- Bottom navigation bar: Vehicles, Log Mileage, Alerts, Profile.
- Mileage entry: large numeric keypad, one-tap submit.
- Vehicle status cards: swipeable, color-coded status bars at top.
- Pull-to-refresh on vehicle list.
- Toast confirmations for logged events.

**Component library (Radix UI):**
- Dialog, Popover, DropdownMenu, Tooltip, Tabs, Select, Switch, Toast for notifications.
- Use @radix-ui/react-* primitives styled with Tailwind.

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Core data model, auth, basic CRUD.

- Set up Next.js project with TypeScript, Tailwind, Radix UI.
- Supabase project setup: PostgreSQL database schema + migrations (Drizzle ORM).
- Auth system: Supabase Auth with email + password, admin + driver roles via RLS (Row Level Security).
- Vehicle CRUD: create, read, update, deactivate.
- Driver CRUD: create, read, update, deactivate.
- Vehicle-driver assignment.
- Bulk import from .xlsx (map existing spreadsheet).
- Seed database with the 14 existing vehicles from the provided spreadsheet.

### Phase 2: Core Features (Weeks 3-4)

**Goal:** Service tracking, inspection management, calculations.

- Mileage logging with validation (monotonic increase).
- Service event logging (A and B types).
- Service calculation engine (next A, next B, status).
- Inspection logging (besiktning, taxameter, SUFT).
- Inspection auto-calculation (next due = last + 12 months).
- Vehicle detail page with all sections.
- Activity logging for all mutations.

### Phase 3: Dashboard & Alerts (Weeks 5-6)

**Goal:** Admin overview, driver view, notifications.

- Admin dashboard: fleet overview cards, attention-needed list, timeline.
- Driver view: mobile-first design, assigned vehicles, 1-tap mileage entry, notes.
- Status badges and color-coded indicators across all views.
- In-app notification system for approaching/overdue deadlines.
- Email digest (daily/weekly) using Resend or similar.
- Command palette (⌘K) for instant navigation.

### Phase 4: Integrations & Polish (Weeks 7-8)

**Goal:** Vehicle data API, export, mobile optimization.

- Swedish vehicle registry API integration (Merinfo.se scraping for MVP, Biluppgifter.se API for production).
- License plate lookup on vehicle creation with fallback chain.
- CSV/PDF export of fleet status and vehicle history.
- PWA support: Add to Home Screen for drivers, offline mileage logging.
- Document upload for inspection reports (Supabase Storage).
- Settings page: notification thresholds, company info, language toggle.
- Final design polish: animations, loading states, empty states.

---

## Out of Scope

- **GPS/live tracking:** No real-time vehicle location tracking.
- **Financial accounting:** No invoicing, payroll, or revenue tracking for taxi rides.
- **Ride dispatching:** No booking or dispatch system (use existing beställningscentral).
- **Automated mileage from OBD/telematics:** Manual mileage entry only for MVP.
- **Multi-company/tenant support:** Single company deployment for now.
- **Redovisningscentral data integration:** No direct data feed from STRUCTAB/DIGITAX (manual entry of taxameter inspection results).
- **Mobile native apps:** Web-only (responsive) for MVP.

---

## Open Questions & Risks

### Open Questions

1. ~~**Vehicle data API choice:**~~ **RESOLVED.** nrpla.de does not work for Swedish plates. Merinfo.se confirmed working (rich data, fetchable). API priority: Merinfo.se (MVP scraping) → Registreringsnummerapi.se (paid, 2 SEK/lookup) → Biluppgifter.se API (production). See REQ-005 for full chain.

2. ~~**Service interval definitions:**~~ **RESOLVED.** Service A (15,000 km) and Service B (30,000 km) are **independent cycles**. Logging a Service B does NOT reset the Service A counter. Each tracks separately from its own last event.

3. ~~**SUFT tracking:**~~ **RESOLVED.** SUFT tracking IS needed. The inspection_type enum includes 'suft' alongside 'besiktning' and 'taxameter'. SUFT inspections follow the same 12-month cycle. Vehicles should indicate whether they use traditional taxameter or SUFT (Särskild Utrustning för Taxifordon, per 2021 law change).

4. ~~**Driver accounts:**~~ **RESOLVED.** Email + password for now. Magic link can be added later as a UX improvement.

5. ~~**Hosting preference:**~~ **RESOLVED.** Vercel (frontend/API) + Supabase (PostgreSQL + Auth + Storage).

### Remaining Open Questions

1. **Merinfo.se B2B API terms:** Need to contact info@merinfo.se to confirm API access, rate limits, and pricing for programmatic vehicle lookups. Web scraping may be sufficient for MVP volumes (~15 vehicles, rare lookups).

2. **Notification delivery channel:** Email digest confirmed. Should we also add push notifications (browser/mobile) for critical overdue alerts? Or is email + in-app sufficient for MVP?

3. **Multi-language support priority:** Swedish confirmed as primary. Is English toggle needed for launch, or can it be deferred to post-MVP?

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Vehicle data API unavailable or too expensive | Medium | Medium | Build manual entry as primary flow; API as enhancement |
| Drivers don't adopt platform | Medium | High | Make driver UX streamlined with a 1-tap mileage log; admin can log on behalf |
| Service calculation logic edge cases | Low | Medium | Extensive testing; admin override capability for manual corrections |
| Data migration errors from Excel | Low | High | Preview + confirm workflow; ability to undo import |

---

## Validation Checkpoints

### Checkpoint 1: After Phase 1 (Week 2)

- [ ] Can create/edit/view vehicles and drivers.
- [ ] Auth works: admin sees all, driver sees assigned only.
- [ ] Excel import successfully loads the 14 existing vehicles.
- [ ] UI follows Linear/Attio design language.

### Checkpoint 2: After Phase 2 (Week 4)

- [ ] Service A/B calculation works correctly for edge cases: new vehicle (no history), vehicle with only A services, vehicle with B service resetting A counter.
- [ ] Inspection logging with auto-calculated next-due dates.
- [ ] Activity log captures all changes.
- [ ] Vehicle detail page is complete and accurate.

### Checkpoint 3: After Phase 3 (Week 6)

- [ ] Dashboard correctly ranks vehicles by urgency.
- [ ] Driver can log mileage from mobile phone.
- [ ] Notifications fire at correct thresholds.
- [ ] A driver logging into the system can only see their vehicles.

### Checkpoint 4: After Phase 4 (Week 8)

- [ ] License plate lookup auto-populates vehicle data.
- [ ] PDF export generates a professional fleet status report.
- [ ] Full end-to-end flow: add vehicle → assign driver → driver logs mileage → service status updates → admin sees dashboard alert → admin logs service → status resets.

---

## Appendix: Task Breakdown Hints

### Estimated Task Distribution

| Phase | Tasks | Estimated Hours | Complexity |
|-------|-------|----------------|------------|
| Phase 1: Foundation | 8-10 | 30-40 | Medium |
| Phase 2: Core Features | 10-12 | 35-45 | High |
| Phase 3: Dashboard & Alerts | 8-10 | 25-35 | Medium |
| Phase 4: Integrations & Polish | 8-10 | 25-35 | Medium |
| **Total** | **34-42** | **115-155** | |

### Key Dependencies

```
Auth system (Supabase Auth + RLS) → blocks all role-based features
Database schema → blocks all CRUD operations
Vehicle CRUD → blocks service tracking, inspections, dashboard
Service calculation engine → blocks dashboard status indicators
Mileage logging → blocks service calculation
Driver view → depends on auth + vehicle assignment
API integration → independent; can be added last
Notification system → depends on service calculation + inspection tracking
```

### Complexity Hotspots

1. **Service A/B calculation engine** — Independent cycles (A and B tracked separately), edge cases around vehicles with no history, retroactive corrections. Needs thorough unit testing.
2. **Role-based access control** — Every API route and UI component must respect roles. Risk of exposing unauthorized endpoints.
3. **Vehicle data API integration** — Multiple provider fallback chain (Merinfo.se → Registreringsnummerapi.se → Biluppgifter.se). External dependencies with varying rate limits, auth, and response formats. Build with circuit breaker pattern and provider abstraction layer.
4. **Bulk Excel import** — Column mapping flexibility, data validation, error handling, preview UI. More complex than it seems.

### Suggested First Tasks

1. Initialize Next.js project with TypeScript, Tailwind, Radix UI, Geist font.
2. Set up Supabase project: PostgreSQL database and Drizzle ORM schema with RLS policies.
3. Implement auth with Supabase Auth (admin + driver roles, email + password).
4. Build vehicle CRUD API routes + basic list/detail UI (mobile-responsive from day one).
5. Build Excel import parser and preview workflow.
6. Seed database from existing spreadsheet.
