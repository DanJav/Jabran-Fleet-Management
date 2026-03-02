# Global Search ⌘K Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a ⌘K command palette to the dashboard top bar that searches vehicles and drivers and navigates to their detail pages.

**Architecture:** A `TopBar` component lives in `DashboardShell`, holding a button styled as a search input. Clicking it (or pressing ⌘K / Ctrl+K) opens `SearchModal`, which fetches vehicles + drivers from Supabase on mount, filters client-side on keystroke, and navigates with `router.push()` on selection.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Supabase client (`@/lib/supabase/client`), lucide-react icons, existing `cn` utility.

---

### Task 1: Create the `SearchModal` component

**Files:**
- Create: `src/components/layout/search-modal.tsx`

**Step 1: Create the file with imports and type definitions**

```tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Car, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface VehicleResult {
  id: string;
  registrationNumber: string;
  make: string | null;
  model: string | null;
}

interface DriverResult {
  id: string;
  name: string;
  email: string;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}
```

**Step 2: Add data fetching logic inside the component**

```tsx
export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [vehicles, setVehicles] = useState<VehicleResult[]>([]);
  const [drivers, setDrivers] = useState<DriverResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Fetch on open
  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("vehicles").select("id, registration_number, make, model").eq("is_active", true),
      supabase.from("drivers").select("id, name, email").eq("is_active", true),
    ]).then(([v, d]) => {
      setVehicles(
        (v.data ?? []).map((r) => ({
          id: r.id,
          registrationNumber: r.registration_number,
          make: r.make,
          model: r.model,
        }))
      );
      setDrivers(d.data ?? []);
    });
    // Reset state on open
    setQuery("");
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);
```

**Step 3: Add filtering and keyboard navigation**

```tsx
  const filteredVehicles = vehicles.filter((v) => {
    const q = query.toLowerCase();
    return (
      v.registrationNumber.toLowerCase().includes(q) ||
      v.make?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q)
    );
  });

  const filteredDrivers = drivers.filter((d) => {
    const q = query.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q);
  });

  // Flat list of all results for keyboard nav
  type ResultItem =
    | { kind: "vehicle"; item: VehicleResult }
    | { kind: "driver"; item: DriverResult };

  const allResults: ResultItem[] = [
    ...filteredVehicles.map((v) => ({ kind: "vehicle" as const, item: v })),
    ...filteredDrivers.map((d) => ({ kind: "driver" as const, item: d })),
  ];

  const navigate = useCallback(
    (result: ResultItem) => {
      if (result.kind === "vehicle") {
        router.push(`/vehicles/${result.item.id}`);
      } else {
        router.push(`/drivers/${result.item.id}`);
      }
      onClose();
    },
    [router, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allResults[activeIndex]) {
      navigate(allResults[activeIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);
```

**Step 4: Add the render/JSX**

```tsx
  if (!open) return null;

  const hasResults = allResults.length > 0;
  const showEmpty = query.length > 0 && !hasResults;

  // Map flat index back to vehicle or driver
  let flatIndex = 0;
  const getIndex = () => flatIndex++;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

      {/* Modal card */}
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sök fordon, förare..."
            className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
          />
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {showEmpty && (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              Inga resultat för &quot;{query}&quot;
            </p>
          )}

          {filteredVehicles.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Fordon
              </p>
              {filteredVehicles.map((v) => {
                const idx = getIndex();
                return (
                  <button
                    key={v.id}
                    onClick={() => navigate({ kind: "vehicle", item: v })}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors",
                      activeIndex === idx && "bg-gray-100"
                    )}
                  >
                    <Car className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-900 font-mono">
                      {v.registrationNumber}
                    </span>
                    {(v.make || v.model) && (
                      <span className="text-sm text-gray-500">
                        {[v.make, v.model].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {filteredDrivers.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Förare
              </p>
              {filteredDrivers.map((d) => {
                const idx = getIndex();
                return (
                  <button
                    key={d.id}
                    onClick={() => navigate({ kind: "driver", item: d })}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors",
                      activeIndex === idx && "bg-gray-100"
                    )}
                  >
                    <Users className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{d.name}</span>
                    <span className="text-sm text-gray-500">{d.email}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/components/layout/search-modal.tsx
git commit -m "feat: add SearchModal component for global search"
```

---

### Task 2: Create the `TopBar` component

**Files:**
- Create: `src/components/layout/top-bar.tsx`

**Step 1: Create the file**

```tsx
"use client";

import { useEffect } from "react";
import { Search } from "lucide-react";

interface TopBarProps {
  onSearchOpen: () => void;
}

export function TopBar({ onSearchOpen }: TopBarProps) {
  // Register ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onSearchOpen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSearchOpen]);

  return (
    <div className="fixed top-0 right-0 left-0 lg:left-60 z-30 h-14 border-b border-gray-200/80 bg-white/95 backdrop-blur-sm flex items-center px-4">
      <button
        onClick={onSearchOpen}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 hover:border-gray-300 transition-colors w-48"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">Sök...</span>
        <kbd className="text-[11px] text-gray-300 font-mono">⌘K</kbd>
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/layout/top-bar.tsx
git commit -m "feat: add TopBar component with search trigger and ⌘K shortcut"
```

---

### Task 3: Wire TopBar and SearchModal into DashboardShell

**Files:**
- Modify: `src/components/layout/dashboard-shell.tsx`

**Step 1: Read the current file, then replace with updated version**

```tsx
"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { SearchModal } from "./search-modal";

interface DashboardShellProps {
  children: React.ReactNode;
  userRole: "admin" | "driver";
  userName: string;
}

export function DashboardShell({ children, userRole, userName }: DashboardShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} userName={userName} />
      <TopBar onSearchOpen={() => setSearchOpen(true)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main className="lg:pl-60 transition-all duration-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 pt-20 lg:pt-20">
          {children}
        </div>
      </main>
    </div>
  );
}
```

Note: `pt-20` (was `pt-16 lg:pt-8`) ensures content clears the new `h-14` top bar on all screen sizes.

**Step 2: Verify the app compiles**

```bash
cd "Jabran Fleet Management" && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

**Step 3: Commit**

```bash
git add src/components/layout/dashboard-shell.tsx
git commit -m "feat: wire TopBar and SearchModal into DashboardShell"
```

---

### Task 4: Handle collapsed sidebar offset

**Context:** The sidebar can collapse to `w-16`. The TopBar currently only accounts for expanded (`lg:left-60`). When collapsed, a gap appears. Since collapse state is local to Sidebar, we need to lift it or use a CSS variable / data attribute.

**Files:**
- Modify: `src/components/layout/dashboard-shell.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/top-bar.tsx`

**Step 1: Lift `collapsed` state from Sidebar into DashboardShell**

In `dashboard-shell.tsx`, add `collapsed` state and pass it as a prop:

```tsx
const [collapsed, setCollapsed] = useState(false);

// Pass to Sidebar:
<Sidebar
  userRole={userRole}
  userName={userName}
  collapsed={collapsed}
  onCollapsedChange={setCollapsed}
/>

// Pass to TopBar:
<TopBar onSearchOpen={() => setSearchOpen(true)} sidebarCollapsed={collapsed} />
```

**Step 2: Update Sidebar to accept and use external collapsed state**

In `sidebar.tsx`, change the interface and remove the local `collapsed` state:

```tsx
interface SidebarProps {
  userRole: "admin" | "driver";
  userName: string;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
}

export function Sidebar({ userRole, userName, collapsed, onCollapsedChange }: SidebarProps) {
  // Remove: const [collapsed, setCollapsed] = useState(false);
  // Replace setCollapsed(!collapsed) with onCollapsedChange(!collapsed)
```

**Step 3: Update TopBar to use the offset**

In `top-bar.tsx`:

```tsx
interface TopBarProps {
  onSearchOpen: () => void;
  sidebarCollapsed: boolean;
}

export function TopBar({ onSearchOpen, sidebarCollapsed }: TopBarProps) {
  // ...
  return (
    <div className={cn(
      "fixed top-0 right-0 z-30 h-14 border-b border-gray-200/80 bg-white/95 backdrop-blur-sm flex items-center px-4 transition-all duration-200",
      sidebarCollapsed ? "left-16" : "left-0 lg:left-60"
    )}>
      {/* ... */}
    </div>
  );
}
```

Add `import { cn } from "@/lib/utils";` to top-bar.tsx.

**Step 4: Verify no TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

**Step 5: Commit**

```bash
git add src/components/layout/dashboard-shell.tsx src/components/layout/sidebar.tsx src/components/layout/top-bar.tsx
git commit -m "feat: sync TopBar offset with sidebar collapsed state"
```

---

### Task 5: Verify end-to-end in dev server

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Manual checklist**

- [ ] Top bar appears across all dashboard pages
- [ ] Clicking "Sök..." opens the modal
- [ ] Pressing ⌘K (Mac) or Ctrl+K (Windows/Linux) opens the modal
- [ ] Typing filters vehicles by reg nr, make, model
- [ ] Typing filters drivers by name, email
- [ ] Arrow keys move the highlighted result
- [ ] Enter navigates to the result's page and closes modal
- [ ] Clicking a result navigates and closes modal
- [ ] Pressing Escape closes modal
- [ ] Clicking backdrop closes modal
- [ ] Collapsing sidebar shifts top bar correctly
- [ ] Mobile: modal is full-width with margin

**Step 3: Commit if all checks pass**

```bash
git add -A
git commit -m "feat: global search ⌘K command palette"
```
