# Driver Detail Page Design

**Date:** 2026-03-02
**Status:** Approved

## Overview

Add a dedicated `/drivers/[id]` page so admins can view and edit driver information by clicking a row in the drivers table.

## Architecture

### New files

- `src/app/(dashboard)/drivers/[id]/page.tsx` — server component, fetches data, calls `notFound()` if driver missing
- `src/components/drivers/driver-detail.tsx` — client component, tabbed UI

### Existing files modified

- `src/components/drivers/driver-list.tsx` — make table rows clickable (`router.push(/drivers/${id})`)

### No new API routes needed

- Read: `GET /api/drivers/[id]` already exists
- Update: `PATCH /api/drivers/[id]` already exists (name, email, phone, role, isActive)

## Data Fetched (Server Component)

- Driver record by ID
- Current vehicle assignments joined with vehicles (reg number, make/model, isPrimary, assignedAt)
- Full assignment history (including unassignedAt)
- Activity log entries where `entityType = 'driver'` and `entityId = driver.id`

## Page Structure

### Header

Back link → "Förare" list. Driver name as page title. Status badge (Aktiv/Inaktiv).

### Tabs (3)

**1. Översikt (Overview)**
- Inline-editable form: name, email, phone, role select, active toggle
- Save button PATCHes `/api/drivers/[id]`
- Inline error message on failure (same style as create dialog)
- Mirrors pattern from `VehicleDetail`

**2. Fordon (Vehicles)**
- Table of current assignments: reg number, make/model, primary flag, assigned date — each row links to `/vehicles/[id]`
- Collapsible section below for past assignments (with unassignedAt date)

**3. Aktivitetslogg (Activity Log)**
- Table: timestamp, action, field changes, performed by
- Most recent first

## Navigation

Table rows in `DriverList` get `cursor-pointer` styling and `onClick={() => router.push(\`/drivers/${driver.id}\`)}`.

## Error States

- Driver not found → `notFound()` (Next.js built-in 404)
- Edit save failure → inline error under form
