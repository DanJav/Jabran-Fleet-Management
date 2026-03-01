import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles, serviceEvents, activityLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const logServiceSchema = z.object({
  serviceType: z.enum(["A", "B"]),
  date: z.string(), // YYYY-MM-DD
  mileageAtService: z.number().int().positive(),
  performedBy: z.string().optional(),
  costSek: z.number().optional(),
  notes: z.string().optional(),
});

export async function POST(
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
    const parsed = logServiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify vehicle exists
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id))
      .limit(1);

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const [event] = await db
      .insert(serviceEvents)
      .values({
        vehicleId: id,
        serviceType: parsed.data.serviceType,
        date: parsed.data.date,
        mileageAtService: parsed.data.mileageAtService,
        performedBy: parsed.data.performedBy,
        costSek: parsed.data.costSek?.toString(),
        notes: parsed.data.notes,
        createdBy: user.id,
      })
      .returning();

    // Update vehicle mileage if service mileage is higher
    if (parsed.data.mileageAtService > vehicle.currentMileage) {
      await db
        .update(vehicles)
        .set({
          currentMileage: parsed.data.mileageAtService,
          updatedAt: new Date(),
        })
        .where(eq(vehicles.id, id));
    }

    // Log activity
    await db.insert(activityLog).values({
      entityType: "service_event",
      entityId: event.id,
      action: "created",
      changes: parsed.data,
      performedBy: user.id,
    });

    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
