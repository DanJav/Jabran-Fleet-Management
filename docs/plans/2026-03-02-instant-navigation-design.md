# Instant Navigation Design

**Date:** 2026-03-02
**Status:** Approved

## Problem

Page transitions show a skeleton flash (`loading.tsx`) because Next.js App Router executes async server components server-side before sending HTML. The `loading.tsx` files render immediately during that server round-trip, creating a visible skeleton screen on every navigation.

## Goal

Navigation feels instant — like a Vite SPA — with no skeleton flash.

## Solution

**Delete the three `loading.tsx` files + add a thin progress bar.**

Without `loading.tsx`, Next.js `<Link>` uses React `startTransition` internally: the old page stays visible until the new page is fully server-rendered, then swaps in one shot. A `next-nprogress-bar` progress line at the top provides feedback that navigation is in flight.

## Changes

1. **Delete** `src/app/(dashboard)/dashboard/loading.tsx`
2. **Delete** `src/app/(dashboard)/vehicles/loading.tsx`
3. **Delete** `src/app/(dashboard)/drivers/loading.tsx`
4. **Install** `next-nprogress-bar`
5. **Add** `<AppProgressBar>` to `src/app/layout.tsx` (root layout, client wrapper)

## What Does Not Change

- Server components and DB queries remain unchanged
- Auth, layout structure, dashboard shell unchanged
- No API routes needed
