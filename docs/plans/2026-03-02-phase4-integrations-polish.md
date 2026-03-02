# Phase 4: Integrations & Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add CSV export, Excel import, license plate lookup, and settings page to complete the MVP.

**Architecture:** New API routes for export/import, server-side vehicle lookup via external APIs, settings stored in a new DB table. All within existing Next.js App Router.

**Tech Stack:** Next.js 16, xlsx (SheetJS) for Excel parsing, jsPDF + jspdf-autotable for PDF, fetch for vehicle API

---

### Task 1: CSV Export

Create API route that generates CSV of all vehicles with current status.

### Task 2: PDF Export

Create API route that generates a fleet status PDF report.

### Task 3: Excel Import — Parser & Preview API

Accept .xlsx upload, parse columns, return preview data.

### Task 4: Excel Import — UI (Upload, Preview, Confirm)

Import page with file upload, column mapping preview, and confirm button.

### Task 5: License Plate Lookup API

Server-side route that fetches vehicle data from Swedish registry.

### Task 6: Integrate Plate Lookup into Vehicle Creation

Add lookup button to the new vehicle form.

### Task 7: Settings Page

Notification thresholds, company info.
