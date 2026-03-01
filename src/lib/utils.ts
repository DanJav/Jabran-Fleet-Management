import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0]; // YYYY-MM-DD (Swedish convention)
}

export function formatMileage(km: number): string {
  return km.toLocaleString("sv-SE") + " km";
}

export function daysUntil(date: Date | string): number {
  const target = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDateStatus(daysRemaining: number): "upcoming" | "due_soon" | "overdue" {
  if (daysRemaining < 0) return "overdue";
  if (daysRemaining <= 30) return "due_soon";
  return "upcoming";
}

export function getMileageStatus(kmRemaining: number): "upcoming" | "due_soon" | "overdue" {
  if (kmRemaining <= 0) return "overdue";
  if (kmRemaining <= 3000) return "due_soon";
  return "upcoming";
}

export type ServiceStatus = "upcoming" | "due_soon" | "overdue";

export function calculateServiceA(currentMileage: number, lastServiceAMileage: number | null) {
  const nextAt = (lastServiceAMileage ?? 0) + 15000;
  const kmRemaining = nextAt - currentMileage;
  return {
    next_at_km: nextAt,
    km_remaining: Math.max(0, kmRemaining),
    status: getMileageStatus(kmRemaining),
  };
}

export function calculateServiceB(currentMileage: number, lastServiceBMileage: number | null) {
  const nextAt = (lastServiceBMileage ?? 0) + 30000;
  const kmRemaining = nextAt - currentMileage;
  return {
    next_at_km: nextAt,
    km_remaining: Math.max(0, kmRemaining),
    status: getMileageStatus(kmRemaining),
  };
}

export function calculateNextInspectionDate(lastInspectionDate: string): string {
  const date = new Date(lastInspectionDate);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split("T")[0];
}
