import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { vehicleAssignments, activityLog } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const assignSchema = z.object({
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid(),
  isPrimary: z.boolean().default(true),
});

const unassignSchema = z.object({
  assignmentId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if driver is already assigned to this vehicle (active assignment)
    const existing = await db
      .select()
      .from(vehicleAssignments)
      .where(
        and(
          eq(vehicleAssignments.vehicleId, parsed.data.vehicleId),
          eq(vehicleAssignments.driverId, parsed.data.driverId),
          isNull(vehicleAssignments.unassignedAt)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Föraren är redan tilldelad detta fordon" },
        { status: 409 }
      );
    }

    const [assignment] = await db
      .insert(vehicleAssignments)
      .values(parsed.data)
      .returning();

    // Log activity
    await db.insert(activityLog).values({
      entityType: "vehicle_assignment",
      entityId: assignment.id,
      action: "created",
      changes: parsed.data,
      performedBy: user.id,
    });

    revalidateTag("vehicles", "default");
    revalidateTag("drivers", "default");
    return NextResponse.json(assignment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = unassignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(vehicleAssignments)
      .set({ unassignedAt: new Date() })
      .where(eq(vehicleAssignments.id, parsed.data.assignmentId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Log activity
    await db.insert(activityLog).values({
      entityType: "vehicle_assignment",
      entityId: parsed.data.assignmentId,
      action: "updated",
      changes: { unassigned: true },
      performedBy: user.id,
    });

    revalidateTag("vehicles", "default");
    revalidateTag("drivers", "default");
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
