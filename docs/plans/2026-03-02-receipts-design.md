# Receipts Feature Design

**Date:** 2026-03-02
**Status:** Approved

## Overview

Drivers upload receipt images/files via a dedicated sidebar tab. Admins review and approve/reject receipts from a global receipts overview page. Receipts are optionally tied to a specific vehicle. The goal is to replace manual receipt sharing (phone/email) with a structured in-app workflow.

---

## Data Model

New `receipts` table in Drizzle schema (`src/db/schema.ts`):

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `driver_id` | uuid → drivers | who submitted |
| `vehicle_id` | uuid → vehicles (nullable) | optional vehicle link |
| `category` | enum | `fuel`, `parking`, `tolls`, `repairs`, `service`, `other` |
| `amount` | decimal (nullable) | optional amount for admin reference |
| `notes` | text (nullable) | driver's free-text note |
| `file_url` | text | Supabase Storage path |
| `file_name` | text | original filename for display |
| `status` | enum | `pending`, `approved`, `rejected` |
| `admin_note` | text (nullable) | admin's reason on rejection |
| `reviewed_by` | uuid → drivers (nullable) | admin who reviewed |
| `reviewed_at` | timestamp (nullable) | when reviewed |
| `submitted_at` | timestamp | defaultNow |

New enums: `receipt_category`, `receipt_status`

Files stored in Supabase Storage bucket `receipts`, path: `receipts/[driverId]/[uuid].[ext]`
Access via short-lived signed URLs (not public).

---

## Routes

### Driver
- `/receipts` — list own receipts, upload new receipt

### Admin
- `/receipts` — global overview of all receipts, filterable by driver/status/category
- `/drivers/[id]` — existing profile page gains a "Kvitton" tab (read-only, contextual)

---

## UI

### Driver `/receipts`
- List of submitted receipts with status badges (pending/approved/rejected)
- "Ladda upp kvitto" button opens upload form:
  - Category dropdown (Bränsle, Parkering, Trängselskatt, Reparationer, Service, Övrigt)
  - Vehicle selector (driver's assigned vehicles + "Ej kopplat till fordon" option)
  - Amount field (optional)
  - Notes textarea
  - File picker (image or PDF)

### Admin `/receipts`
- Filterable table: driver name, category, vehicle, amount, submitted date, status
- Filters: status, driver, category
- Click row → slide-over panel showing:
  - Receipt image/file preview
  - All metadata and driver notes
  - Approve button
  - Reject button (prompts for optional admin note)

### Admin `/drivers/[id]` — Kvitton tab
- Read-only list of that driver's receipts with status badges
- No action buttons (admin acts from the main `/receipts` page)

### Sidebar changes
- **Admin nav:** add "Kvitton" (`/receipts`) between Drivers and Settings
- **Driver nav:** add "Kvitton" (`/receipts`) after "Mina fordon"
- Icon: `Receipt` from lucide-react

---

## API Routes

All under `src/app/api/receipts/`:

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/receipts` | GET | driver (own) / admin (all) | List receipts |
| `/api/receipts` | POST | driver | Submit receipt + upload file |
| `/api/receipts/[id]` | GET | driver (own) / admin | Single receipt detail |
| `/api/receipts/[id]` | PATCH | admin only | Update status (approve/reject) |

### File Upload Flow
1. Driver submits form with file
2. Server uploads file to Supabase Storage → `receipts/[driverId]/[uuid].[ext]`
3. DB row inserted with `file_url` = storage path
4. On display, generate a short-lived signed URL via Supabase Storage API

---

## Authorization
- Drivers: read/create own receipts only
- Admins: read all receipts, patch status
- Storage RLS: drivers read own folder, admins read all

---

## Out of Scope
- Email notifications on status change (can be added later)
- Bulk approve/reject
- Receipt export/PDF report
