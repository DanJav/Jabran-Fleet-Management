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
    const result = await fetchFromCarInfo(plate);
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

async function fetchFromCarInfo(plate: string) {
  const url = `https://www.car.info/sv-se/license-plate/S/${plate}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TaxiFleet/1.0)",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return null;

  const html = await res.text();

  const make = extractMeta(html, "make") || extractFromTitle(html, "make");
  const model = extractMeta(html, "model") || extractFromTitle(html, "model");
  const year = extractMeta(html, "year");
  const color = extractFromPage(html, "Färg");
  const fuel =
    extractFromPage(html, "Drivmedel") || extractFromPage(html, "Bränsle");
  const vin =
    extractFromPage(html, "Chassinr") || extractFromPage(html, "VIN");

  if (!make && !model) return null;

  return {
    registrationNumber: plate,
    make: make || undefined,
    model: model || undefined,
    modelYear: year ? parseInt(year) : undefined,
    color: color || undefined,
    fuelType: fuel || undefined,
    vin: vin || undefined,
    source: "car.info",
  };
}

function extractMeta(html: string, field: string): string | null {
  const jsonLdMatch = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
  );
  if (jsonLdMatch) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      if (field === "make" && data.brand?.name) return data.brand.name;
      if (field === "model" && data.model) return data.model;
      if (field === "year" && data.vehicleModelDate)
        return data.vehicleModelDate;
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

function extractFromTitle(html: string, field: string): string | null {
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  if (!titleMatch) return null;
  const title = titleMatch[1];
  const parts = title.split(/\s+/);
  if (field === "make" && parts.length >= 1) return parts[0];
  if (field === "model" && parts.length >= 2) return parts[1];
  return null;
}

function extractFromPage(html: string, label: string): string | null {
  const patterns = [
    new RegExp(`${label}[:\\s]*</[^>]+>\\s*<[^>]+>\\s*([^<]+)`, "i"),
    new RegExp(`>${label}<[^>]*>[^<]*<[^>]*>([^<]+)`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}
