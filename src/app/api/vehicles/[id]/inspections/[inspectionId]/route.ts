import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { inspections, activityLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { calculateNextInspectionDate } from "@/lib/utils";
import { z } from "zod";

const patchInspectionSchema = z.object({
  inspectionType: z.enum(["besiktning", "taxameter", "suft"]).optional(),
  date: z.string().optional(),
  result: z
    .enum(["approved", "approved_with_notes", "failed"])
    .nullable()
    .optional(),
  performedBy: z.string().optional(),
  notes: z.string().optional(),
  avvikelse: z.string().optional(),
  documentUrl: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inspectionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { inspectionId } = await params;
    const body = await request.json();
    const parsed = patchInspectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(inspections)
      .where(eq(inspections.id, inspectionId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    const updateValues: Record<string, unknown> = { ...parsed.data };

    if (parsed.data.date) {
      updateValues.nextDueDate = calculateNextInspectionDate(parsed.data.date);
    }

    const [updated] = await db
      .update(inspections)
      .set(updateValues)
      .where(eq(inspections.id, inspectionId))
      .returning();

    await db.insert(activityLog).values({
      entityType: "inspection",
      entityId: inspectionId,
      action: "updated",
      changes: { vehicleId: existing.vehicleId, old: existing, new: parsed.data },
      performedBy: user.id,
    });

    revalidateTag("vehicles", "default");

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /inspections/[inspectionId]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; inspectionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { inspectionId } = await params;

    const [existing] = await db
      .select()
      .from(inspections)
      .where(eq(inspections.id, inspectionId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    await db.insert(activityLog).values({
      entityType: "inspection",
      entityId: inspectionId,
      action: "deleted",
      changes: { vehicleId: existing.vehicleId, inspectionType: existing.inspectionType, date: existing.date },
      performedBy: user.id,
    });

    await db.delete(inspections).where(eq(inspections.id, inspectionId));

    revalidateTag("vehicles", "default");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /inspections/[inspectionId]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
