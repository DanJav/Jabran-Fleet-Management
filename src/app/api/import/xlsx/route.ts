import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles, inspections, activityLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import * as XLSX from "xlsx";

const COLUMN_MAP: Record<string, string> = {
  registreringsnummer: "registrationNumber",
  "reg.nr": "registrationNumber",
  regnr: "registrationNumber",
  fabrikat: "make",
  modell: "model",
  "årsmodell": "modelYear",
  "fordonsår": "modelYear",
  "färg": "color",
  "bränsle": "fuelType",
  drivmedel: "fuelType",
  chassinr: "vin",
  vin: "vin",
  "mätarställning": "currentMileage",
  redovisningscentral: "redovisningscentral",
  "taxameter fabrikat": "taxameterMake",
  "taxameter typ": "taxameterType",
  "taxameter serienummer": "taxameterSerial",
  besiktningsdatum: "inspectionDate",
};

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[\/\\]/g, " ")
    .replace(/\s+/g, " ");
}

function mapHeader(header: string): string | null {
  const normalized = normalizeHeader(header);

  for (const [pattern, field] of Object.entries(COLUMN_MAP)) {
    if (normalized.includes(pattern)) {
      return field;
    }
  }
  return null;
}

interface ParsedRow {
  registrationNumber?: string;
  make?: string;
  model?: string;
  modelYear?: number;
  color?: string;
  fuelType?: string;
  vin?: string;
  currentMileage?: number;
  redovisningscentral?: string;
  taxameterMake?: string;
  taxameterType?: string;
  taxameterSerial?: string;
  inspectionDate?: string;
}

function parseExcelFile(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (rawData.length === 0) {
    return { rows: [], columns: [] };
  }

  const originalHeaders = Object.keys(rawData[0]);
  const headerMapping: Record<string, string | null> = {};
  for (const header of originalHeaders) {
    headerMapping[header] = mapHeader(header);
  }

  const columns = originalHeaders.map((original) => ({
    original,
    mapped: headerMapping[original],
  }));

  const rows: ParsedRow[] = rawData.map((raw) => {
    const row: Record<string, unknown> = {};

    for (const [original, mapped] of Object.entries(headerMapping)) {
      if (!mapped) continue;
      const value = raw[original];

      if (mapped === "modelYear") {
        const num = parseInt(String(value), 10);
        if (!isNaN(num)) row[mapped] = num;
      } else if (mapped === "currentMileage") {
        let num = parseInt(String(value).replace(/\s/g, ""), 10);
        if (!isNaN(num)) {
          // Swedish "mil" conversion: if value seems too low, multiply by 10
          if (num > 0 && num < 100000) {
            num = num * 10;
          }
          row[mapped] = num;
        }
      } else if (mapped === "registrationNumber") {
        row[mapped] = String(value).toUpperCase().replace(/\s/g, "");
      } else if (mapped === "inspectionDate") {
        if (value instanceof Date) {
          row[mapped] = value.toISOString().split("T")[0];
        } else if (value) {
          const str = String(value).trim();
          // Try to parse common date formats
          const dateMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            row[mapped] = str;
          } else {
            // Try DD/MM/YYYY or similar
            const altMatch = str.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
            if (altMatch) {
              row[mapped] = `${altMatch[3]}-${altMatch[2].padStart(2, "0")}-${altMatch[1].padStart(2, "0")}`;
            }
          }
        }
      } else {
        const str = String(value).trim();
        if (str) row[mapped] = str;
      }
    }

    return row as ParsedRow;
  });

  return { rows, columns };
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Ingen fil uppladdad" }, { status: 400 });
    }

    if (!file.name.match(/\.xlsx?$/i)) {
      return NextResponse.json(
        { error: "Filen måste vara en Excel-fil (.xlsx eller .xls)" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const { rows, columns } = parseExcelFile(buffer);

    const mode = request.nextUrl.searchParams.get("mode") || "preview";

    if (mode === "preview") {
      return NextResponse.json({
        rows,
        columns,
        rowCount: rows.length,
      });
    }

    // Confirm mode: insert vehicles
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      if (!row.registrationNumber) {
        errors.push("Rad saknar registreringsnummer, hoppar över");
        continue;
      }

      try {
        // Check for duplicate
        const existing = await db
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(eq(vehicles.registrationNumber, row.registrationNumber))
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        const inspectionDate = row.inspectionDate;

        const [vehicle] = await db
          .insert(vehicles)
          .values({
            registrationNumber: row.registrationNumber,
            make: row.make,
            model: row.model,
            modelYear: row.modelYear,
            color: row.color,
            fuelType: row.fuelType,
            vin: row.vin,
            currentMileage: row.currentMileage ?? 0,
            redovisningscentral: row.redovisningscentral,
            taxameterMake: row.taxameterMake,
            taxameterType: row.taxameterType,
            taxameterSerial: row.taxameterSerial,
            hasTaxameter: !!(row.taxameterMake || row.taxameterSerial),
          })
          .returning();

        // Create initial inspection if date provided
        if (inspectionDate && vehicle) {
          const nextYear = new Date(inspectionDate);
          nextYear.setFullYear(nextYear.getFullYear() + 1);

          await db.insert(inspections).values({
            vehicleId: vehicle.id,
            inspectionType: "besiktning",
            date: inspectionDate,
            nextDueDate: nextYear.toISOString().split("T")[0],
            result: "approved",
            createdBy: admin.id,
          });
        }

        // Log activity
        await db.insert(activityLog).values({
          entityType: "vehicle",
          entityId: vehicle.id,
          action: "imported",
          changes: { source: "excel", registrationNumber: row.registrationNumber },
          performedBy: admin.id,
        });

        imported++;
      } catch (err) {
        errors.push(
          `Fel vid import av ${row.registrationNumber}: ${err instanceof Error ? err.message : "Okänt fel"}`
        );
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch (err) {
    if (err instanceof Error && (err.message === "Unauthorized" || err.message.includes("Forbidden"))) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
