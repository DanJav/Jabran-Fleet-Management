# Phase 3: Dashboard & Driver Experience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the dashboard experience with status columns, next-deadline card, driver alert banner, notes system, and vehicle detail polish.

**Architecture:** All changes are within the existing Next.js App Router structure. New API route for notes, modifications to dashboard page/component and vehicle detail component. No new dependencies needed.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM, Radix UI, Tailwind CSS 4, Supabase Auth

---

### Task 1: Add Active/Inactive Status Badge to Dashboard Table

**Files:**
- Modify: `src/components/dashboard/dashboard-content.tsx`

**Step 1: Add status badge to desktop table**

Add a "Status" column after "Fordon" (make/model) in the desktop table. Show a green "Aktiv" or gray "Inaktiv" badge using the existing `Badge` component.

In `dashboard-content.tsx`, add a new `<TableHead>` after the "Fordon" head:

```tsx
<TableHead>Status</TableHead>
```

And a corresponding `<TableCell>` after the make/model cell:

```tsx
<TableCell>
  <Badge variant={vehicle.isActive ? "success" : "default"}>
    {vehicle.isActive ? "Aktiv" : "Inaktiv"}
  </Badge>
</TableCell>
```

**Step 2: Add status badge to mobile cards**

In the mobile card view, add the badge next to the registration number in the header row, alongside the existing worst-status badge:

```tsx
{!vehicle.isActive && (
  <Badge variant="default">Inaktiv</Badge>
)}
```

**Step 3: Include inactive vehicles in dashboard data**

Currently `src/app/(dashboard)/dashboard/page.tsx` line 43 skips inactive vehicles (`if (!vehicle.isActive) continue;`). Change this to include inactive vehicles but sort them to the bottom:

```tsx
// Remove: if (!vehicle.isActive) continue;
// Instead, after building vehiclesWithStatus, sort inactive to bottom:
vehiclesWithStatus.sort((a, b) => {
  // Inactive vehicles go to the bottom
  if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
  // Then sort by worst status
  return statusOrder[a.worstStatus] - statusOrder[b.worstStatus];
});
```

Update `totalActive` to only count active vehicles:

```tsx
const totalActive = vehiclesWithStatus.filter((v) => v.isActive).length;
```

**Step 4: Verify the dev server renders correctly**

Run: `npm run dev`
Check: Dashboard shows status column, inactive vehicles appear at bottom with gray badge.

**Step 5: Commit**

```bash
git add src/components/dashboard/dashboard-content.tsx src/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat: add active/inactive status badge to dashboard table"
```

---

### Task 2: Replace "OK" Summary Card with "Nästa deadline"

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `src/components/dashboard/dashboard-content.tsx`

**Step 1: Compute nearest deadline in the server page**

In `dashboard/page.tsx`, after building `vehiclesWithStatus`, compute the nearest deadline across the fleet:

```tsx
type NextDeadline = {
  vehicleReg: string;
  type: string;
  value: string;
  daysOrKm: number;
} | null;

let nextDeadline: NextDeadline = null;

for (const v of vehiclesWithStatus) {
  if (!v.isActive) continue;

  const candidates = [
    { type: "Service A", value: `${v.serviceAKmRemaining.toLocaleString("sv-SE")} km`, daysOrKm: v.serviceAKmRemaining, vehicleReg: v.registrationNumber },
    { type: "Service B", value: `${v.serviceBKmRemaining.toLocaleString("sv-SE")} km`, daysOrKm: v.serviceBKmRemaining, vehicleReg: v.registrationNumber },
  ];
  if (v.besiktningNextDate) {
    candidates.push({ type: "Besiktning", value: `${v.besiktningDaysRemaining} dagar`, daysOrKm: v.besiktningDaysRemaining, vehicleReg: v.registrationNumber });
  }
  if (v.taxameterNextDate) {
    candidates.push({ type: "Taxameter", value: `${v.taxameterDaysRemaining} dagar`, daysOrKm: v.taxameterDaysRemaining, vehicleReg: v.registrationNumber });
  }

  for (const c of candidates) {
    if (!nextDeadline || c.daysOrKm < nextDeadline.daysOrKm) {
      nextDeadline = c;
    }
  }
}
```

Pass `nextDeadline` to `DashboardContent`.

**Step 2: Update DashboardContent props and replace 4th card**

In `dashboard-content.tsx`, update the props interface to include `nextDeadline`. Replace the "OK" summary card with:

```tsx
<Card>
  <CardContent className="p-4">
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-gray-50 p-2">
        <Calendar className="h-4 w-4 text-violet-600" />
      </div>
      <div>
        <p className="text-[11px] font-medium text-gray-500 tracking-wide">Nästa deadline</p>
        {nextDeadline ? (
          <>
            <p className="text-sm font-semibold text-gray-900">{nextDeadline.type}</p>
            <p className="text-[11px] text-gray-400">{nextDeadline.vehicleReg} · {nextDeadline.value}</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-gray-900">Inga kommande</p>
        )}
      </div>
    </div>
  </CardContent>
</Card>
```

Import `Calendar` from `lucide-react`.

**Step 3: Verify**

Run: `npm run dev`
Check: 4th card now shows nearest deadline with vehicle reg, type, and remaining value.

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/page.tsx src/components/dashboard/dashboard-content.tsx
git commit -m "feat: replace OK card with nearest deadline summary card"
```

---

### Task 3: Add Driver Alert Banner

**Files:**
- Modify: `src/components/dashboard/dashboard-content.tsx`

**Step 1: Add alert banner for driver view**

At the top of the `DashboardContent` component's return, before the page header, add a driver alert banner when any vehicle is overdue or due within 14 days:

```tsx
{isDriver && (() => {
  const alerts: { reg: string; item: string; status: "overdue" | "due_soon" }[] = [];
  for (const v of vehicles) {
    if (v.serviceAStatus === "overdue") alerts.push({ reg: v.registrationNumber, item: "Service A", status: "overdue" });
    if (v.serviceBStatus === "overdue") alerts.push({ reg: v.registrationNumber, item: "Service B", status: "overdue" });
    if (v.besiktningStatus === "overdue") alerts.push({ reg: v.registrationNumber, item: "Besiktning", status: "overdue" });
    if (v.taxameterStatus === "overdue") alerts.push({ reg: v.registrationNumber, item: "Taxameter", status: "overdue" });
    // Due within 14 days
    if (v.besiktningDaysRemaining >= 0 && v.besiktningDaysRemaining <= 14 && v.besiktningStatus !== "overdue")
      alerts.push({ reg: v.registrationNumber, item: `Besiktning (${v.besiktningDaysRemaining}d)`, status: "due_soon" });
    if (v.taxameterDaysRemaining >= 0 && v.taxameterDaysRemaining <= 14 && v.taxameterStatus !== "overdue")
      alerts.push({ reg: v.registrationNumber, item: `Taxameter (${v.taxameterDaysRemaining}d)`, status: "due_soon" });
    if (v.serviceAKmRemaining > 0 && v.serviceAKmRemaining <= 1000 && v.serviceAStatus !== "overdue")
      alerts.push({ reg: v.registrationNumber, item: `Service A (${v.serviceAKmRemaining.toLocaleString("sv-SE")} km)`, status: "due_soon" });
    if (v.serviceBKmRemaining > 0 && v.serviceBKmRemaining <= 1000 && v.serviceBStatus !== "overdue")
      alerts.push({ reg: v.registrationNumber, item: `Service B (${v.serviceBKmRemaining.toLocaleString("sv-SE")} km)`, status: "due_soon" });
  }

  const overdueAlerts = alerts.filter(a => a.status === "overdue");
  const soonAlerts = alerts.filter(a => a.status === "due_soon");

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {overdueAlerts.length > 0 && (
        <div className="rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200/60">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-[13px] font-medium text-red-800">
              Försenat: {overdueAlerts.map(a => `${a.reg} — ${a.item}`).join(", ")}
            </p>
          </div>
        </div>
      )}
      {soonAlerts.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-200/60">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-[13px] font-medium text-amber-800">
              Snart: {soonAlerts.map(a => `${a.reg} — ${a.item}`).join(", ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
})()}
```

Note: Need to also pass `besiktningDaysRemaining`, `taxameterDaysRemaining`, `serviceAKmRemaining`, `serviceBKmRemaining` — these are already in the `VehicleWithStatus` type.

**Step 2: Verify**

Run: `npm run dev`
Check: When logged in as driver with an assigned vehicle that has overdue items, a red banner appears. Amber for due-soon.

**Step 3: Commit**

```bash
git add src/components/dashboard/dashboard-content.tsx
git commit -m "feat: add driver alert banner for overdue and due-soon items"
```

---

### Task 4: Notes API Route

**Files:**
- Create: `src/app/api/vehicles/[id]/notes/route.ts`

**Step 1: Create the notes API route**

```tsx
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes, activityLog, vehicleAssignments } from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const createNoteSchema = z.object({
  content: z.string().min(1).max(2000),
  tag: z.enum(["issue", "maintenance", "general"]).default("general"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id: vehicleId } = await params;

  // If driver, verify assignment
  if (user.role === "driver") {
    const [assignment] = await db
      .select()
      .from(vehicleAssignments)
      .where(
        and(
          eq(vehicleAssignments.vehicleId, vehicleId),
          eq(vehicleAssignments.driverId, user.id),
          isNull(vehicleAssignments.unassignedAt)
        )
      )
      .limit(1);
    if (!assignment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const vehicleNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.vehicleId, vehicleId))
    .orderBy(desc(notes.createdAt));

  return NextResponse.json(vehicleNotes);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id: vehicleId } = await params;

  // If driver, verify assignment
  if (user.role === "driver") {
    const [assignment] = await db
      .select()
      .from(vehicleAssignments)
      .where(
        and(
          eq(vehicleAssignments.vehicleId, vehicleId),
          eq(vehicleAssignments.driverId, user.id),
          isNull(vehicleAssignments.unassignedAt)
        )
      )
      .limit(1);
    if (!assignment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga data", details: parsed.error.flatten() }, { status: 400 });
  }

  const [note] = await db
    .insert(notes)
    .values({
      vehicleId,
      authorId: user.id,
      content: parsed.data.content,
      tag: parsed.data.tag,
    })
    .returning();

  await db.insert(activityLog).values({
    entityType: "note",
    entityId: note.id,
    action: "created",
    changes: { content: parsed.data.content, tag: parsed.data.tag },
    performedBy: user.id,
  });

  return NextResponse.json(note, { status: 201 });
}
```

**Step 2: Verify route exists**

Run: `npm run dev`
Check: No compile errors.

**Step 3: Commit**

```bash
git add src/app/api/vehicles/\[id\]/notes/route.ts
git commit -m "feat: add notes API route for vehicles"
```

---

### Task 5: Notes UI on Vehicle Detail Page

**Files:**
- Modify: `src/app/(dashboard)/vehicles/[id]/page.tsx`
- Modify: `src/components/vehicles/vehicle-detail.tsx`

**Step 1: Fetch notes in the server page**

In `vehicles/[id]/page.tsx`, add a query for notes after the mileage history query:

```tsx
import { notes as notesTable } from "@/db/schema";

// After mileageHistory query:
const vehicleNotes = await db
  .select({
    id: notesTable.id,
    content: notesTable.content,
    tag: notesTable.tag,
    createdAt: notesTable.createdAt,
    authorId: notesTable.authorId,
    authorName: drivers.name,
  })
  .from(notesTable)
  .leftJoin(drivers, eq(notesTable.authorId, drivers.id))
  .where(eq(notesTable.vehicleId, id))
  .orderBy(desc(notesTable.createdAt));
```

Pass `vehicleNotes` as a prop to `VehicleDetail`.

**Step 2: Add notes section to VehicleDetail component**

Replace the existing simple notes card (lines 414-425 in vehicle-detail.tsx which just shows `vehicle.notes`) with a full notes section:

```tsx
{/* Notes section */}
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <CardTitle className="text-sm">Anteckningar</CardTitle>
    <AddNoteDialog vehicleId={vehicle.id} />
  </CardHeader>
  <CardContent>
    {vehicleNotes.length === 0 ? (
      <p className="text-sm text-gray-500">Inga anteckningar</p>
    ) : (
      <div className="space-y-3">
        {vehicleNotes.map((note) => (
          <div key={note.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={note.tag === "issue" ? "danger" : note.tag === "maintenance" ? "warning" : "default"}>
                {note.tag === "issue" ? "Problem" : note.tag === "maintenance" ? "Underhåll" : "Allmänt"}
              </Badge>
              <span className="text-[11px] text-gray-400">
                {note.authorName || "Okänd"} · {formatDate(note.createdAt)}
              </span>
            </div>
            <p className="text-[13px] text-gray-700">{note.content}</p>
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>
```

**Step 3: Add the AddNoteDialog component**

Add a new dialog component inside `vehicle-detail.tsx`:

```tsx
function AddNoteDialog({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [tag, setTag] = useState<"general" | "issue" | "maintenance">("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/vehicles/${vehicleId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, tag }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Något gick fel");
      setLoading(false);
      return;
    }

    setOpen(false);
    setContent("");
    setTag("general");
    setLoading(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquare className="h-4 w-4 mr-1" />
          Ny anteckning
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ny anteckning</DialogTitle>
          <DialogDescription>Lägg till en anteckning för detta fordon</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200/60">{error}</p>
          )}
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={tag} onValueChange={(v) => setTag(v as "general" | "issue" | "maintenance")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Allmänt</SelectItem>
                <SelectItem value="issue">Problem</SelectItem>
                <SelectItem value="maintenance">Underhåll</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Anteckning</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Skriv din anteckning..."
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !content.trim()}>
            {loading ? "Sparar..." : "Spara anteckning"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Import `MessageSquare` from `lucide-react`.

**Step 4: Verify**

Run: `npm run dev`
Check: Vehicle detail page shows notes section with add button. Creating a note refreshes the page.

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/vehicles/\[id\]/page.tsx src/components/vehicles/vehicle-detail.tsx
git commit -m "feat: add notes system to vehicle detail page"
```

---

### Task 6: Vehicle Detail — Unified Activity Timeline

**Files:**
- Modify: `src/components/vehicles/vehicle-detail.tsx`

**Step 1: Create a unified timeline section**

Replace the three separate history tables (service, inspection, mileage) with a single unified timeline that merges all events chronologically. Keep the separate tables but add a new "Tidslinje" (Timeline) card at the top that shows the most recent 20 events across all types:

```tsx
{/* Unified timeline */}
<Card>
  <CardHeader>
    <CardTitle className="text-sm">Tidslinje</CardTitle>
  </CardHeader>
  <CardContent>
    {(() => {
      type TimelineEvent = {
        id: string;
        type: "service" | "inspection" | "mileage" | "note";
        date: Date;
        title: string;
        detail: string;
      };

      const events: TimelineEvent[] = [
        ...services.map((s) => ({
          id: s.id,
          type: "service" as const,
          date: new Date(s.date),
          title: `Service ${s.serviceType}`,
          detail: `${s.mileageAtService.toLocaleString("sv-SE")} km${s.performedBy ? ` · ${s.performedBy}` : ""}`,
        })),
        ...inspections.map((i) => ({
          id: i.id,
          type: "inspection" as const,
          date: new Date(i.date),
          title: i.inspectionType === "besiktning" ? "Besiktning" : i.inspectionType === "taxameter" ? "Taxameter" : "SUFT",
          detail: i.result === "approved" ? "Godkänd" : i.result === "failed" ? "Underkänd" : i.result === "approved_with_notes" ? "Godkänd m. anm." : "",
        })),
        ...mileageHistory.map((m) => ({
          id: m.id,
          type: "mileage" as const,
          date: new Date(m.loggedAt),
          title: "Mätaravläsning",
          detail: `${m.mileage.toLocaleString("sv-SE")} km`,
        })),
        ...vehicleNotes.map((n) => ({
          id: n.id,
          type: "note" as const,
          date: new Date(n.createdAt),
          title: n.tag === "issue" ? "Problem" : n.tag === "maintenance" ? "Underhåll" : "Anteckning",
          detail: n.content.length > 80 ? n.content.slice(0, 80) + "…" : n.content,
        })),
      ];

      events.sort((a, b) => b.date.getTime() - a.date.getTime());
      const recent = events.slice(0, 20);

      if (recent.length === 0) {
        return <p className="text-sm text-gray-500">Ingen aktivitet registrerad</p>;
      }

      const typeIcons: Record<string, { icon: string; color: string }> = {
        service: { icon: "🔧", color: "bg-blue-100 text-blue-700" },
        inspection: { icon: "📋", color: "bg-violet-100 text-violet-700" },
        mileage: { icon: "📏", color: "bg-gray-100 text-gray-700" },
        note: { icon: "💬", color: "bg-amber-100 text-amber-700" },
      };

      return (
        <div className="space-y-3">
          {recent.map((event) => (
            <div key={`${event.type}-${event.id}`} className="flex items-start gap-3">
              <span className={`text-xs rounded-md px-1.5 py-0.5 font-medium ${typeIcons[event.type].color}`}>
                {typeIcons[event.type].icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-gray-900">{event.title}</p>
                  <span className="text-[11px] text-gray-400 shrink-0 ml-2">{formatDate(event.date)}</span>
                </div>
                <p className="text-[12px] text-gray-500 truncate">{event.detail}</p>
              </div>
            </div>
          ))}
        </div>
      );
    })()}
  </CardContent>
</Card>
```

Place this card after the action buttons and before the vehicle details cards.

**Step 2: Verify**

Run: `npm run dev`
Check: Vehicle detail shows unified timeline with color-coded event types, sorted newest first.

**Step 3: Commit**

```bash
git add src/components/vehicles/vehicle-detail.tsx
git commit -m "feat: add unified activity timeline to vehicle detail page"
```

---

### Task 7: Final Verification & Lint

**Step 1: Run lint**

Run: `npx eslint . --ext .ts,.tsx`
Expected: No errors.

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

**Step 3: Fix any issues found**

Address any lint or type errors.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve lint and type errors from phase 3 changes"
```

**Step 5: Push to remote**

```bash
git push
```
