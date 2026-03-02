import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { vehicles, serviceEvents, inspections, mileageLogs, vehicleAssignments, drivers, activityLog } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const updateVehicleSchema = z.object({
  registrationNumber: z.string().min(1).max(10).optional(),
  vin: z.string().optional().nullable(),
  make: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  modelYear: z.number().int().optional().nullable(),
  color: z.string().optional().nullable(),
  fuelType: z.string().optional().nullable(),
  hasTaxameter: z.boolean().optional(),
  equipmentType: z.enum(["taxameter", "suft", "none"]).optional(),
  taxameterMake: z.string().optional().nullable(),
  taxameterType: z.string().optional().nullable(),
  taxameterSerial: z.string().optional().nullable(),
  redovisningscentral: z.string().optional().nullable(),
  currentMileage: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id))
      .limit(1);

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Get latest service events
    const services = await db
      .select()
      .from(serviceEvents)
      .where(eq(serviceEvents.vehicleId, id))
      .orderBy(desc(serviceEvents.date));

    // Get inspections
    const vehicleInspections = await db
      .select()
      .from(inspections)
      .where(eq(inspections.vehicleId, id))
      .orderBy(desc(inspections.date));

    // Get mileage log (last 20)
    const mileageHistory = await db
      .select()
      .from(mileageLogs)
      .where(eq(mileageLogs.vehicleId, id))
      .orderBy(desc(mileageLogs.loggedAt))
      .limit(20);

    // Get assigned drivers
    const assignments = await db
      .select({
        assignment: vehicleAssignments,
        driver: drivers,
      })
      .from(vehicleAssignments)
      .innerJoin(drivers, eq(vehicleAssignments.driverId, drivers.id))
      .where(
        and(
          eq(vehicleAssignments.vehicleId, id),
          // Only active assignments (not unassigned)
        )
      );

    const activeAssignments = assignments.filter(
      (a) => a.assignment.unassignedAt === null
    );

    return NextResponse.json({
      vehicle,
      services,
      inspections: vehicleInspections,
      mileageHistory,
      assignments: activeAssignments,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Get current vehicle for change tracking
    const [existing] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (updateData.registrationNumber) {
      updateData.registrationNumber = (updateData.registrationNumber as string).toUpperCase();
    }

    const [updated] = await db
      .update(vehicles)
      .set(updateData)
      .where(eq(vehicles.id, id))
      .returning();

    // Log activity
    await db.insert(activityLog).values({
      entityType: "vehicle",
      entityId: id,
      action: "updated",
      changes: { old: existing, new: parsed.data },
      performedBy: user.id,
    });

    revalidateTag("vehicles", "default");
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
