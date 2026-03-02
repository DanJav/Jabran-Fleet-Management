import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { vehicles, mileageLogs, activityLog } from "@/db/schema";
import { eq, max } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const patchMileageSchema = z.object({
  mileage: z.number().int().positive().optional(),
  notes: z.string().optional(),
  loggedAt: z.string().optional(), // ISO date string e.g. "2026-03-01"
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, logId } = await params;
    const body = await request.json();
    const parsed = patchMileageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(mileageLogs)
      .where(eq(mileageLogs.id, logId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Mileage log not found" },
        { status: 404 }
      );
    }

    const updateValues: Partial<typeof mileageLogs.$inferInsert> = {};
    if (parsed.data.mileage !== undefined) {
      updateValues.mileage = parsed.data.mileage;
    }
    if (parsed.data.notes !== undefined) {
      updateValues.notes = parsed.data.notes;
    }
    if (parsed.data.loggedAt !== undefined) {
      updateValues.loggedAt = new Date(parsed.data.loggedAt);
    }

    const [updated] = await db
      .update(mileageLogs)
      .set(updateValues)
      .where(eq(mileageLogs.id, logId))
      .returning();

    if (parsed.data.mileage !== undefined) {
      const [result] = await db
        .select({ maxMileage: max(mileageLogs.mileage) })
        .from(mileageLogs)
        .where(eq(mileageLogs.vehicleId, existing.vehicleId));
      const newMax = result?.maxMileage ?? 0;

      await db
        .update(vehicles)
        .set({ currentMileage: newMax, updatedAt: new Date() })
        .where(eq(vehicles.id, existing.vehicleId));
    }

    await db.insert(activityLog).values({
      entityType: "mileage_log",
      entityId: logId,
      action: "updated",
      changes: {
        vehicleId: existing.vehicleId,
        old: { mileage: existing.mileage },
        new: parsed.data,
      },
      performedBy: user.id,
    });

    revalidateTag("vehicles", "default");
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/vehicles/[id]/mileage/[logId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { logId } = await params;

    const [existing] = await db
      .select()
      .from(mileageLogs)
      .where(eq(mileageLogs.id, logId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Mileage log not found" },
        { status: 404 }
      );
    }

    await db.insert(activityLog).values({
      entityType: "mileage_log",
      entityId: logId,
      action: "deleted",
      changes: {
        vehicleId: existing.vehicleId,
        mileage: existing.mileage,
        loggedAt: existing.loggedAt,
      },
      performedBy: user.id,
    });

    await db.delete(mileageLogs).where(eq(mileageLogs.id, logId));

    const [result] = await db
      .select({ maxMileage: max(mileageLogs.mileage) })
      .from(mileageLogs)
      .where(eq(mileageLogs.vehicleId, existing.vehicleId));
    const newMax = result?.maxMileage ?? 0;

    await db
      .update(vehicles)
      .set({ currentMileage: newMax, updatedAt: new Date() })
      .where(eq(vehicles.id, existing.vehicleId));

    revalidateTag("vehicles", "default");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/vehicles/[id]/mileage/[logId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
