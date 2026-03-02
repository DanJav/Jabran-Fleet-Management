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
- **Notes System**: Free-form notes on vehicles with tags (issue/maintenance/general)
- **Activity Timeline**: Unified chronological view of all vehicle events
- **CSV Export**: Download fleet status as semicolon-delimited CSV (Swedish Excel compatible)
- **Excel Import**: Upload .xlsx to bulk-import vehicles with preview and confirm
- **License Plate Lookup**: Auto-populate vehicle data from Swedish registry (car.info)
- **Settings**: Configurable notification thresholds and company info
- **Email Notifications**: Daily/weekly fleet status digest via Resend
- **Activity Logging**: Audit trail for all data mutations
- **Mobile Responsive**: Card layouts on mobile, tables on desktop

## Email Notifications Setup

Email notifications send a digest of overdue and due-soon vehicles to your inbox. This is optional — the app works fine without it.

### 1. Get a Resend API key

1. Sign up at [resend.com](https://resend.com) (free tier: 100 emails/day)
2. Go to **API Keys** and create a new key
3. Add it to your `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```

### 2. (Optional) Custom from address

By default, emails come from `noreply@resend.dev`. To use your own domain:

1. In Resend, go to **Domains** and add your domain (e.g. `yourdomain.se`)
2. Add the DNS records Resend provides (SPF, DKIM, DMARC)
3. Set in `.env.local`:
   ```
   RESEND_FROM_EMAIL=TaxiFleet <noreply@yourdomain.se>
   ```

### 3. Enable in the app

1. Go to **Inställningar** (Settings) in the sidebar
2. Toggle **Aktivera e-postsammanfattning**
3. Enter the email address to receive notifications
4. Choose frequency: **Dagligen** (daily) or **Veckovis** (weekly)
5. Click **Spara**

### 4. Test it

Visit `/api/notify` while logged in as admin to trigger a test email.

### 5. (Production) Set up Vercel Cron

The `vercel.json` is already configured to run `/api/notify` daily at 7am UTC. To secure it:

1. Generate a secret: `openssl rand -hex 32`
2. Add to your Vercel environment variables:
   ```
   CRON_SECRET=your-generated-secret
   ```
3. Deploy — Vercel Cron will automatically call the endpoint with the correct auth header

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/       # Login page
│   ├── (dashboard)/        # Protected layout with sidebar
│   │   ├── dashboard/      # Fleet overview
│   │   ├── vehicles/       # Vehicle list, detail, create, import
│   │   ├── drivers/        # Driver management
│   │   └── settings/       # Notification thresholds, email config
│   └── api/                # API routes
│       ├── vehicles/       # Vehicle CRUD + mileage/service/inspection/notes/lookup
│       ├── drivers/        # Driver CRUD
│       ├── assignments/    # Vehicle-driver assignments
│       ├── export/csv/     # CSV fleet export
│       ├── import/xlsx/    # Excel bulk import
│       ├── settings/       # App settings CRUD
│       └── notify/         # Email digest (Vercel Cron)
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
