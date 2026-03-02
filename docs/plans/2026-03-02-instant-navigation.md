# Instant Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate skeleton flash on page transitions by removing `loading.tsx` files and adding a thin progress bar.

**Architecture:** Without `loading.tsx`, Next.js `<Link>` keeps the old page visible via `startTransition` until the server finishes rendering the new page, then swaps instantly. A `next-nprogress-bar` `<AppProgressBar>` component mounted in the root layout provides visual feedback during the transition.

**Tech Stack:** Next.js App Router, `next-nprogress-bar`

---

### Task 1: Delete the three loading.tsx files

**Files:**
- Delete: `src/app/(dashboard)/dashboard/loading.tsx`
- Delete: `src/app/(dashboard)/vehicles/loading.tsx`
- Delete: `src/app/(dashboard)/drivers/loading.tsx`

**Step 1: Delete the files**

```bash
rm "src/app/(dashboard)/dashboard/loading.tsx"
rm "src/app/(dashboard)/vehicles/loading.tsx"
rm "src/app/(dashboard)/drivers/loading.tsx"
```

**Step 2: Verify they're gone**

```bash
find src/app -name "loading.tsx"
```
Expected: no output

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: remove loading.tsx skeleton screens for instant navigation"
```

---

### Task 2: Install next-nprogress-bar

**Step 1: Install the package**

```bash
npm install next-nprogress-bar
```

**Step 2: Verify install**

```bash
cat package.json | grep next-nprogress-bar
```
Expected: a version line like `"next-nprogress-bar": "^2.x.x"`

---

### Task 3: Add AppProgressBar to root layout

**Files:**
- Create: `src/components/providers/progress-bar.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Create the client wrapper component**

`src/components/providers/progress-bar.tsx`:
```tsx
"use client";

import { AppProgressBar } from "next-nprogress-bar";

export function ProgressBar() {
  return (
    <AppProgressBar
      height="2px"
      color="#2563eb"
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}
```

> Note: `color` is blue-600 from the Tailwind palette — adjust to match the app's primary accent if needed. `showSpinner` is false to avoid a spinner in the top-right corner.

**Step 2: Mount it in the root layout**

Modify `src/app/layout.tsx` — add the import and render `<ProgressBar />` inside `<body>`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ProgressBar } from "@/components/providers/progress-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaxiFleet — Fordonshantering",
  description: "Fordonshantering och serviceuppföljning för taxiflottan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ProgressBar />
        {children}
      </body>
    </html>
  );
}
```

**Step 3: Run the dev server and verify manually**

```bash
npm run dev
```

Navigate between Dashboard → Vehicles → Drivers. Expected:
- No skeleton flash
- Old page stays visible during transition
- Thin blue line animates at the top of the page
- New page appears fully rendered

**Step 4: Commit**

```bash
git add src/components/providers/progress-bar.tsx src/app/layout.tsx package.json package-lock.json
git commit -m "feat: add progress bar for instant navigation feel"
```
