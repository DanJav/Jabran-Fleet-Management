import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { vehicles, mileageLogs, activityLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const logMileageSchema = z.object({
  mileage: z.number().int().positive(),
  notes: z.string().optional(),
  loggedAt: z.string().optional(), // ISO date string e.g. "2026-03-01"
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = logMileageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Get current vehicle
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id))
      .limit(1);

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Enforce monotonically increasing mileage
    if (parsed.data.mileage < vehicle.currentMileage) {
      return NextResponse.json(
        {
          error: `Mätarställning måste vara minst ${vehicle.currentMileage} km (kan inte minska)`,
        },
        { status: 400 }
      );
    }

    // Log mileage
    const [log] = await db
      .insert(mileageLogs)
      .values({
        vehicleId: id,
        mileage: parsed.data.mileage,
        loggedBy: user.id,
        source: "manual",
        notes: parsed.data.notes,
        loggedAt: parsed.data.loggedAt ? new Date(parsed.data.loggedAt) : new Date(),
      })
      .returning();

    // Update vehicle current mileage
    await db
      .update(vehicles)
      .set({
        currentMileage: parsed.data.mileage,
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, id));

    // Log activity
    await db.insert(activityLog).values({
      entityType: "mileage_log",
      entityId: log.id,
      action: "created",
      changes: {
        vehicleId: id,
        oldMileage: vehicle.currentMileage,
        newMileage: parsed.data.mileage,
      },
      performedBy: user.id,
    });

    revalidateTag("vehicles", "default");
    return NextResponse.json(log, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
