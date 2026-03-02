import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const plate = req.nextUrl.searchParams.get("plate")?.toUpperCase().trim();
  if (!plate || !/^[A-Z]{3}\d{2}[A-Z0-9]$/.test(plate)) {
    return NextResponse.json(
      { error: "Ogiltigt registreringsnummer. Format: ABC123 eller ABC12A" },
      { status: 400 }
    );
  }

  try {
    const result = await fetchFromBilprovningen(plate);
    if (result) {
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Kunde inte hämta fordonsdata. Fyll i manuellt." },
      { status: 404 }
    );
  } catch {
    return NextResponse.json(
      { error: "Uppslagning misslyckades. Fyll i manuellt." },
      { status: 502 }
    );
  }
}

/**
 * Bilprovningen's booking API exposes vehicle data by plate number.
 * Free, no auth required, returns JSON directly.
 */
async function fetchFromBilprovningen(plate: string) {
  const url = `https://boka.bilprovningen.se/api/v1/booking/vehicle?registrationNumber=${encodeURIComponent(plate)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return null;

  const data = await res.json();

  // vehicleName = make (e.g. "TOYOTA"), vehicleYear = 2022, color = "Svart"
  if (!data.vehicleName && !data.vehicleYear) return null;

  const make = data.vehicleName
    ? toTitleCase(data.vehicleName as string)
    : undefined;
  const color = data.color ? toTitleCase(data.color as string) : undefined;
  const year = data.vehicleYear ? Number(data.vehicleYear) : undefined;

  return {
    registrationNumber: plate,
    make,
    modelYear: year,
    color,
    source: "bilprovningen",
  };
}

function toTitleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
