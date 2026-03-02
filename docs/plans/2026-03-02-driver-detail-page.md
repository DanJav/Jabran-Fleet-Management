# Driver Detail Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/drivers/[id]` detail page where admins can view and edit driver info, see assigned vehicles, and review the activity log.

**Architecture:** Server component fetches all data and passes it to a `DriverDetail` client component that renders three tabs (Översikt, Fordon, Aktivitetslogg). Table rows in `DriverList` become clickable links. No new API routes — existing `GET` and `PATCH /api/drivers/[id]` cover everything.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Tailwind CSS, shadcn/ui components, TypeScript

---

### Task 1: Make driver table rows clickable

**Files:**
- Modify: `src/components/drivers/driver-list.tsx`

**Context:** The `DriverList` component renders a `<Table>` with a `<TableRow>` per driver. We need each row to navigate to `/drivers/${driver.id}` on click. The component already imports `useRouter` from `next/navigation`.

**Step 1: Add `cursor-pointer` and `onClick` to each desktop TableRow**

In the `<TableBody>` section (desktop table), find each `<TableRow key={driver.id}>` and add:

```tsx
<TableRow
  key={driver.id}
  className="cursor-pointer hover:bg-gray-50"
  onClick={() => router.push(`/drivers/${driver.id}`)}
>
```

**Step 2: Do the same for mobile rows**

Find `<div key={driver.id} className="p-4">` in the mobile section and change it to:

```tsx
<div
  key={driver.id}
  className="p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
  onClick={() => router.push(`/drivers/${driver.id}`)}
>
```

**Step 3: Remove the "Inaktivera/Aktivera" toggle button from the table**

The toggle button in the last `<TableCell>` will move to the detail page. Delete this entire cell:

```tsx
<TableCell>
  <Button
    variant="ghost"
    size="sm"
    onClick={() => toggleActive(driver.id, driver.isActive)}
  >
    {driver.isActive ? "Inaktivera" : "Aktivera"}
  </Button>
</TableCell>
```

Also remove the matching `<TableHead></TableHead>` (last header cell) and the `toggleActive` function and its `<TableHead>` if no longer used.

**Step 4: Commit**

```bash
git add src/components/drivers/driver-list.tsx
git commit -m "feat: make driver rows clickable, navigate to detail page"
```

---

### Task 2: Create the server page component

**Files:**
- Create: `src/app/(dashboard)/drivers/[id]/page.tsx`

**Context:** This mirrors the pattern in `src/app/(dashboard)/vehicles/[id]/page.tsx`. It's a server component that fetches data using Drizzle and passes it to the client component. Use `requireAdmin` from `@/lib/auth` (same as the drivers list page). Use `notFound()` from `next/navigation` if the driver doesn't exist.

**Step 1: Create the file**

```tsx
import { db } from "@/db";
import { drivers, vehicleAssignments, vehicles, activityLog } from "@/db/schema";
import { eq, desc, and, isNull, isNotNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { notFound } from "next/navigation";
import { DriverDetail } from "@/components/drivers/driver-detail";

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  // Fetch driver
  const [driver] = await db
    .select()
    .from(drivers)
    .where(eq(drivers.id, id))
    .limit(1);

  if (!driver) notFound();

  // Current assignments (no unassignedAt)
  const currentAssignments = await db
    .select({
      id: vehicleAssignments.id,
      isPrimary: vehicleAssignments.isPrimary,
      assignedAt: vehicleAssignments.assignedAt,
      vehicleId: vehicles.id,
      registrationNumber: vehicles.registrationNumber,
      make: vehicles.make,
      model: vehicles.model,
    })
    .from(vehicleAssignments)
    .innerJoin(vehicles, eq(vehicleAssignments.vehicleId, vehicles.id))
    .where(
      and(eq(vehicleAssignments.driverId, id), isNull(vehicleAssignments.unassignedAt))
    );

  // Past assignments (unassignedAt is set)
  const pastAssignments = await db
    .select({
      id: vehicleAssignments.id,
      isPrimary: vehicleAssignments.isPrimary,
      assignedAt: vehicleAssignments.assignedAt,
      unassignedAt: vehicleAssignments.unassignedAt,
      vehicleId: vehicles.id,
      registrationNumber: vehicles.registrationNumber,
      make: vehicles.make,
      model: vehicles.model,
    })
    .from(vehicleAssignments)
    .innerJoin(vehicles, eq(vehicleAssignments.vehicleId, vehicles.id))
    .where(
      and(eq(vehicleAssignments.driverId, id), isNotNull(vehicleAssignments.unassignedAt))
    )
    .orderBy(desc(vehicleAssignments.unassignedAt));

  // Activity log for this driver
  const activityEntries = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      changes: activityLog.changes,
      createdAt: activityLog.createdAt,
      performedByName: drivers.name,
    })
    .from(activityLog)
    .leftJoin(drivers, eq(activityLog.performedBy, drivers.id))
    .where(
      and(
        eq(activityLog.entityType, "driver"),
        eq(activityLog.entityId, id)
      )
    )
    .orderBy(desc(activityLog.createdAt));

  return (
    <DriverDetail
      driver={driver}
      currentAssignments={currentAssignments}
      pastAssignments={pastAssignments}
      activityEntries={activityEntries}
    />
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/drivers/[id]/page.tsx
git commit -m "feat: add driver detail server page with data fetching"
```

---

### Task 3: Create the DriverDetail client component

**Files:**
- Create: `src/components/drivers/driver-detail.tsx`

**Context:** This is the main UI component. It mirrors `VehicleDetail` in structure. It has three tabs rendered with a simple `useState` for the active tab (no external tab library needed — the project uses plain Tailwind). Use components from `@/components/ui/` — `Button`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Badge`, `Input`, `Label`, `Select`, `Table` etc. All are already available.

**Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { Driver } from "@/db/schema";

interface CurrentAssignment {
  id: string;
  isPrimary: boolean;
  assignedAt: Date;
  vehicleId: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface PastAssignment extends CurrentAssignment {
  unassignedAt: Date | null;
}

interface ActivityEntry {
  id: string;
  action: string;
  changes: unknown;
  createdAt: Date;
  performedByName: string | null;
}

interface DriverDetailProps {
  driver: Driver;
  currentAssignments: CurrentAssignment[];
  pastAssignments: PastAssignment[];
  activityEntries: ActivityEntry[];
}

type Tab = "overview" | "vehicles" | "activity";

export function DriverDetail({
  driver,
  currentAssignments,
  pastAssignments,
  activityEntries,
}: DriverDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Edit form state
  const [name, setName] = useState(driver.name);
  const [email, setEmail] = useState(driver.email);
  const [phone, setPhone] = useState(driver.phone ?? "");
  const [role, setRole] = useState<"admin" | "driver">(driver.role);
  const [isActive, setIsActive] = useState(driver.isActive);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    const res = await fetch(`/api/drivers/${driver.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone: phone || null,
        role,
        isActive,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setSaveError(data.error || "Något gick fel");
      return;
    }

    setSaveSuccess(true);
    router.refresh();
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Översikt" },
    { id: "vehicles", label: `Fordon (${currentAssignments.length})` },
    { id: "activity", label: "Aktivitetslogg" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/drivers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
              {driver.name}
            </h1>
            <p className="text-[13px] text-gray-500">{driver.email}</p>
          </div>
        </div>
        <Badge variant={driver.isActive ? "success" : "default"}>
          {driver.isActive ? "Aktiv" : "Inaktiv"}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Förarinformation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4 max-w-md">
              {saveError && (
                <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200/60">
                  {saveError}
                </p>
              )}
              {saveSuccess && (
                <p className="text-[13px] text-green-700 bg-green-50 rounded-lg px-3 py-2 ring-1 ring-green-200/60">
                  Sparat
                </p>
              )}
              <div className="space-y-2">
                <Label>Namn</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>E-post</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="070-123 45 67"
                />
              </div>
              <div className="space-y-2">
                <Label>Roll</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "admin" | "driver")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driver">Förare</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={isActive ? "active" : "inactive"}
                  onValueChange={(v) => setIsActive(v === "active")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Sparar..." : "Spara ändringar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Vehicles Tab */}
      {activeTab === "vehicles" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tilldelade fordon</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {currentAssignments.length === 0 ? (
                <p className="text-[13px] text-gray-500 p-4">Inga fordon tilldelade</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registreringsnummer</TableHead>
                      <TableHead>Fordon</TableHead>
                      <TableHead>Primär</TableHead>
                      <TableHead>Tilldelad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentAssignments.map((a) => (
                      <TableRow
                        key={a.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/vehicles/${a.vehicleId}`)}
                      >
                        <TableCell className="font-medium">{a.registrationNumber}</TableCell>
                        <TableCell className="text-gray-500">{a.make} {a.model}</TableCell>
                        <TableCell>
                          {a.isPrimary ? (
                            <Badge variant="accent">Primär</Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-500">{formatDate(a.assignedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {pastAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Tidigare fordon</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registreringsnummer</TableHead>
                      <TableHead>Fordon</TableHead>
                      <TableHead>Tilldelad</TableHead>
                      <TableHead>Avslutad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastAssignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-gray-500">{a.registrationNumber}</TableCell>
                        <TableCell className="text-gray-400">{a.make} {a.model}</TableCell>
                        <TableCell className="text-gray-400">{formatDate(a.assignedAt)}</TableCell>
                        <TableCell className="text-gray-400">
                          {a.unassignedAt ? formatDate(a.unassignedAt) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Aktivitetslogg</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activityEntries.length === 0 ? (
              <p className="text-[13px] text-gray-500 p-4">Ingen aktivitet registrerad</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Åtgärd</TableHead>
                    <TableHead>Utförd av</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-gray-500 text-[13px]">
                        {formatDate(entry.createdAt)}
                      </TableCell>
                      <TableCell className="capitalize">{entry.action}</TableCell>
                      <TableCell className="text-gray-500">
                        {entry.performedByName ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/drivers/driver-detail.tsx
git commit -m "feat: add DriverDetail component with tabbed overview, vehicles, activity log"
```

---

### Task 4: Add loading skeleton

**Files:**
- Create: `src/app/(dashboard)/drivers/[id]/loading.tsx`

**Context:** The drivers list already has `src/app/(dashboard)/drivers/loading.tsx`. Add a loading file for the detail route to show a skeleton while data fetches.

**Step 1: Create the file**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DriverDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/drivers/[id]/loading.tsx
git commit -m "feat: add loading skeleton for driver detail page"
```

---

### Task 5: Verify end-to-end

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Manual checks**

1. Go to `/drivers` — click a driver row → should navigate to `/drivers/<id>`
2. Edit name, email, phone, role, or status → click "Spara ändringar" → "Sparat" appears, header badge updates on refresh
3. Click "Fordon" tab → current vehicles listed, clickable to vehicle detail page
4. Click "Aktivitetslogg" tab → entries appear (or empty state if none)
5. Go back via arrow → returns to drivers list

**Step 3: Run linter**

```bash
npm run lint
```

Expected: no errors.

**Step 4: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "fix: lint cleanup for driver detail page"
```
