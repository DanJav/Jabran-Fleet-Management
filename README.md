# TaxiFleet — Fleet Service Manager

Fleet service management platform for a Swedish taxi company. Tracks vehicle inspections (besiktning), taximeter inspections, mileage-based service intervals (A/B), and driver assignments.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **UI**: Radix UI + Tailwind CSS 4 (Linear/Attio design aesthetic)
- **Database**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM
- **Auth**: Supabase Auth (email + password)
- **Deployment**: Vercel + Supabase

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))

### Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy the env example and fill in your Supabase credentials:
   ```bash
   cp .env.local.example .env.local
   ```

3. Run the SQL migration in your Supabase SQL Editor:
   ```
   drizzle/0000_init.sql
   ```

4. Create an admin user in Supabase Auth, then insert a matching driver record:
   ```sql
   INSERT INTO drivers (auth_user_id, name, email, role)
   VALUES ('<supabase-auth-user-uuid>', 'Admin', 'admin@example.se', 'admin');
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

## Features

- **Dashboard**: Fleet overview with compliance status (Service A/B, besiktning, taxameter)
- **Vehicle Management**: CRUD, detail pages with service/inspection history
- **Service Tracking**: Independent Service A (15,000 km) and B (30,000 km) cycles
- **Inspection Tracking**: Besiktning, taxameter, SUFT with auto-calculated next-due dates
- **Mileage Logging**: Monotonically increasing odometer readings
- **Driver Management**: Create/deactivate drivers, assign to vehicles
- **Role-Based Access**: Admin (full access) vs Driver (assigned vehicles only)
- **Activity Logging**: Audit trail for all data mutations
- **Mobile Responsive**: Card layouts on mobile, tables on desktop

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/       # Login page
│   ├── (dashboard)/        # Protected layout with sidebar
│   │   ├── dashboard/      # Fleet overview
│   │   ├── vehicles/       # Vehicle list, detail, create
│   │   └── drivers/        # Driver management
│   └── api/                # API routes
│       ├── vehicles/       # Vehicle CRUD + mileage/service/inspection
│       ├── drivers/        # Driver CRUD
│       └── assignments/    # Vehicle-driver assignments
├── components/
│   ├── ui/                 # Reusable UI primitives
│   ├── layout/             # Sidebar, dashboard shell
│   ├── dashboard/          # Dashboard content
│   ├── vehicles/           # Vehicle list, detail, form
│   └── drivers/            # Driver list
├── db/
│   ├── schema.ts           # Drizzle ORM schema
│   └── index.ts            # Database connection
└── lib/
    ├── utils.ts            # Utilities (service calculation, formatting)
    ├── auth.ts             # Auth helpers
    └── supabase/           # Supabase client (browser, server, middleware)
```
