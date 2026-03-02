# Settings Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the existing settings page with a redesigned version matching the mockup, adding new fields (organisationsnummer, contactEmail, serviceIntervalA/B, notifyOverdueService, warningThresholdDays, language) and removing old threshold fields.

**Architecture:** Update DB schema → push to Supabase → update API Zod schema → add Switch UI component → redesign settings page UI.

**Tech Stack:** Next.js 15, Drizzle ORM, Supabase (postgres), Zod, Radix UI Switch, Tailwind CSS

---

### Task 1: Add Switch UI component

**Files:**
- Create: `src/components/ui/switch.tsx`

**Step 1: Create the component**

```tsx
"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-gray-900 data-[state=unchecked]:bg-gray-200",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ui/switch.tsx
git commit -m "feat: add Switch UI component"
```

---

### Task 2: Update DB schema

**Files:**
- Modify: `src/db/schema.ts`

**Step 1: Replace old threshold fields with new fields**

In `src/db/schema.ts`, find the `settings` table and replace the four threshold fields plus add new fields. The full updated table definition:

```ts
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
```

Fields removed: `thresholdServiceWarning`, `thresholdServiceCritical`, `thresholdInspectionWarning`, `thresholdInspectionCritical`

Fields added: `organisationsnummer`, `contactEmail`, `serviceIntervalA`, `serviceIntervalB`, `notifyOverdueService`, `warningThresholdDays`, `language`

**Step 2: Push schema to Supabase**

```bash
cd "/Users/danjav/Jabran Fleet Management"
npm run db:push
```

Accept prompts to drop old columns and add new ones.

**Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: update settings schema - replace thresholds with service intervals and new fields"
```

---

### Task 3: Update API route

**Files:**
- Modify: `src/app/api/settings/route.ts`

**Step 1: Replace the Zod schema**

Replace `updateSettingsSchema` with:

```ts
const updateSettingsSchema = z.object({
  companyName: z.string().max(200).optional(),
  organisationsnummer: z.string().max(50).optional(),
  contactEmail: z.string().email().optional().nullable(),
  serviceIntervalA: z.number().int().min(0).optional(),
  serviceIntervalB: z.number().int().min(0).optional(),
  notifyEmailEnabled: z.boolean().optional(),
  notifyOverdueService: z.boolean().optional(),
  notifyEmail: z.string().email().optional().nullable(),
  warningThresholdDays: z.number().int().min(0).optional(),
  emailDigestFrequency: z.enum(["daily", "weekly"]).optional(),
  language: z.enum(["sv", "en"]).optional(),
});
```

**Step 2: Commit**

```bash
git add src/app/api/settings/route.ts
git commit -m "feat: update settings API schema for new fields"
```

---

### Task 4: Redesign settings page UI

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`

**Step 1: Rewrite the page to match the mockup**

The mockup has these visual characteristics:
- Section headers: small caps labels (e.g. "FÖRETAGSUPPGIFTER") as `text-[10px] font-semibold uppercase tracking-widest text-gray-400`
- White card sections with `rounded-xl border border-gray-100 bg-white p-6 shadow-sm`
- Two-column grid for paired inputs
- Toggle rows: label on left, Switch on right, description below label
- Dropdown for warning threshold (30/60/90 days) and language
- Save button bottom-right: "Spara inställningar"

Full page implementation:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettingsData {
  companyName: string;
  organisationsnummer: string;
  contactEmail: string | null;
  serviceIntervalA: number;
  serviceIntervalB: number;
  notifyEmailEnabled: boolean;
  notifyOverdueService: boolean;
  notifyEmail: string | null;
  warningThresholdDays: number;
  emailDigestFrequency: string;
  language: string;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
      {label}
    </p>
  );
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-[13px] font-medium text-gray-900">{label}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Inställningar sparade" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Kunde inte spara" });
      }
    } catch {
      setMessage({ type: "error", text: "Nätverksfel" });
    }
    setSaving(false);
  };

  const patch = (partial: Partial<SettingsData>) =>
    setSettings((s) => s && { ...s, ...partial });

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
          Inställningar
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">Laddar...</p>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
          Inställningar
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Hantera systemkonfiguration
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-[13px] ring-1 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60"
              : "bg-red-50 text-red-700 ring-red-200/60"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Företagsuppgifter */}
      <SettingCard>
        <SectionHeader label="Företagsuppgifter" />
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Företagsnamn</Label>
            <Input
              value={settings.companyName}
              onChange={(e) => patch({ companyName: e.target.value })}
              placeholder="Mitt taxibolag AB"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Organisationsnummer</Label>
              <Input
                value={settings.organisationsnummer}
                onChange={(e) => patch({ organisationsnummer: e.target.value })}
                placeholder="556123-4567"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kontakt-e-post</Label>
              <Input
                type="email"
                value={settings.contactEmail || ""}
                onChange={(e) =>
                  patch({ contactEmail: e.target.value || null })
                }
                placeholder="admin@taxifleet.se"
              />
            </div>
          </div>
        </div>
      </SettingCard>

      {/* Serviceintervall */}
      <SettingCard>
        <SectionHeader label="Serviceintervall" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Service A intervall (km)</Label>
            <Input
              type="number"
              value={settings.serviceIntervalA}
              onChange={(e) =>
                patch({ serviceIntervalA: parseInt(e.target.value) || 0 })
              }
              min={0}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Service B intervall (km)</Label>
            <Input
              type="number"
              value={settings.serviceIntervalB}
              onChange={(e) =>
                patch({ serviceIntervalB: parseInt(e.target.value) || 0 })
              }
              min={0}
            />
          </div>
        </div>
      </SettingCard>

      {/* Notifieringar */}
      <SettingCard>
        <SectionHeader label="Notifieringar" />
        <ToggleRow
          label="E-postnotifieringar"
          description="Daglig sammanfattning av kommande deadlines"
          checked={settings.notifyEmailEnabled}
          onCheckedChange={(v) => patch({ notifyEmailEnabled: v })}
        />
        <ToggleRow
          label="Varning vid försenad service"
          description="Omedelbar notifiering vid försenad kontroll"
          checked={settings.notifyOverdueService}
          onCheckedChange={(v) => patch({ notifyOverdueService: v })}
        />
        <div className="pt-4 space-y-1.5">
          <Label>Varningströskel (dagar)</Label>
          <Select
            value={String(settings.warningThresholdDays)}
            onValueChange={(v) =>
              patch({ warningThresholdDays: parseInt(v) })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="14">14 dagar</SelectItem>
              <SelectItem value="30">30 dagar</SelectItem>
              <SelectItem value="60">60 dagar</SelectItem>
              <SelectItem value="90">90 dagar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingCard>

      {/* Språk & Format */}
      <SettingCard>
        <SectionHeader label="Språk & Format" />
        <div className="space-y-1.5">
          <Label>Språk</Label>
          <Select
            value={settings.language}
            onValueChange={(v) => patch({ language: v })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sv">Svenska</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingCard>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Sparar..." : "Spara inställningar"}
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/settings/page.tsx
git commit -m "feat: redesign settings page with new sections and fields"
```

---

### Task 5: Verify

**Step 1:** Start dev server and navigate to `/settings`

```bash
npm run dev
```

Check that:
- All 4 sections render correctly
- Toggles work
- Dropdowns work
- Save button posts to API and shows success message
- No TypeScript/ESLint errors

**Step 2:** Run lint

```bash
npm run lint
```

Expected: no errors.
