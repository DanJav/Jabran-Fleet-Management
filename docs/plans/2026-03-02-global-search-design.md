# Global Search — Design Doc

**Date:** 2026-03-02
**Status:** Approved

## Overview

Add a ⌘K command palette to the top bar of the dashboard. Users can search across vehicles and drivers and navigate directly to a detail page on selection.

## Architecture

- **Top bar**: A new `<TopBar>` component added to `dashboard-shell.tsx`. Contains a search trigger button styled to look like an input (placeholder "Sök...", ⌘K hint on the right).
- **Search modal**: A `<SearchModal>` component rendered at root level, toggled via a shared `useSearchModal` hook (or simple state lifted into DashboardShell).
- **Data**: Fetch all vehicles and drivers from Supabase on modal open (not on keystroke). Filter client-side by the query string.
- **Navigation**: On result select, call `router.push()` to the item's detail page and close modal.

## Components

### `TopBar`
- Fixed height (`h-14`), sits above `<main>`, spans full width minus sidebar width.
- Contains a `<button>` styled as a search input (not a real `<input>`).
- Keyboard shortcut: registers `⌘K` / `Ctrl+K` globally to open modal.

### `SearchModal`
- Full-screen backdrop with centered card (max-w-lg).
- Real `<input>` autofocused on open.
- Results grouped: **Fordon** section, **Förare** section.
- Each result shows icon + reg nr / name + secondary info (make/model or email).
- Keyboard nav: arrow keys move selection, Enter navigates, Escape closes.
- Empty state: "Inga resultat för [query]".

## Data Flow

1. User clicks search trigger or presses ⌘K → modal opens.
2. Modal mounts → fetch vehicles + drivers from Supabase (single Promise.all).
3. User types → filter in-memory (name, reg nr, email, make/model).
4. User selects result → `router.push(href)` → modal closes.

## Styling

- Neutral palette (no purple). Active result uses `bg-gray-100` highlight.
- Consistent with existing sidebar aesthetic (gray-900 text, gray-200 borders).
- Mobile: modal takes full width with slight margin.

## Files to Create/Modify

- `src/components/layout/top-bar.tsx` — new
- `src/components/layout/search-modal.tsx` — new
- `src/components/layout/dashboard-shell.tsx` — add TopBar, wire modal state
- `src/app/(dashboard)/layout.tsx` — verify padding accounts for top bar (if needed)
