import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { vehicles, activityLog } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const createVehicleSchema = z.object({
  registrationNumber: z.string().min(1).max(10),
  vin: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  modelYear: z.number().int().optional(),
  color: z.string().optional(),
  fuelType: z.string().optional(),
  hasTaxameter: z.boolean().default(true),
  equipmentType: z.enum(["taxameter", "suft", "none"]).default("taxameter"),
  taxameterMake: z.string().optional(),
  taxameterType: z.string().optional(),
  taxameterSerial: z.string().optional(),
  redovisningscentral: z.string().optional(),
  currentMileage: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allVehicles = await db
      .select()
      .from(vehicles)
      .orderBy(desc(vehicles.createdAt));

    return NextResponse.json(allVehicles);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check for duplicate registration number
    const existing = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.registrationNumber, parsed.data.registrationNumber.toUpperCase()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Registreringsnumret finns redan" },
        { status: 409 }
      );
    }

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        ...parsed.data,
        registrationNumber: parsed.data.registrationNumber.toUpperCase(),
      })
      .returning();

    // Log activity
    await db.insert(activityLog).values({
      entityType: "vehicle",
      entityId: vehicle.id,
      action: "created",
      changes: { vehicle: parsed.data },
      performedBy: user.id,
    });

    revalidateTag("vehicles", "default");
    return NextResponse.json(vehicle, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
