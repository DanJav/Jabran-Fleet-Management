import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles, inspections, activityLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { calculateNextInspectionDate } from "@/lib/utils";
import { z } from "zod";

const logInspectionSchema = z.object({
  inspectionType: z.enum(["besiktning", "taxameter", "suft"]),
  date: z.string(), // YYYY-MM-DD
  result: z.enum(["approved", "approved_with_notes", "failed"]).optional(),
  performedBy: z.string().optional(),
  notes: z.string().optional(),
  avvikelse: z.string().optional(),
  documentUrl: z.string().optional(),
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
    const parsed = logInspectionSchema.safeParse(body);

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

    const nextDueDate = calculateNextInspectionDate(parsed.data.date);

    const [inspection] = await db
      .insert(inspections)
      .values({
        vehicleId: id,
        inspectionType: parsed.data.inspectionType,
        date: parsed.data.date,
        nextDueDate,
        result: parsed.data.result,
        performedBy: parsed.data.performedBy,
        notes: parsed.data.notes,
        avvikelse: parsed.data.avvikelse,
        documentUrl: parsed.data.documentUrl,
        createdBy: user.id,
      })
      .returning();

    // Log activity
    await db.insert(activityLog).values({
      entityType: "inspection",
      entityId: inspection.id,
      action: "created",
      changes: { ...parsed.data, nextDueDate },
      performedBy: user.id,
    });

    return NextResponse.json(inspection, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
