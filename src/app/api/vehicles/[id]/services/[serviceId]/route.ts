import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { serviceEvents, activityLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const updateServiceSchema = z.object({
  serviceType: z.enum(["A", "B"]).optional(),
  date: z.string().optional(),
  mileageAtService: z.number().int().positive().optional(),
  performedBy: z.string().nullable().optional(),
  costSek: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { serviceId } = await params;
    const body = await request.json();
    const parsed = updateServiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(serviceEvents)
      .where(eq(serviceEvents.id, serviceId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Service event not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if ("costSek" in parsed.data && parsed.data.costSek !== undefined) {
      updateData.costSek =
        parsed.data.costSek !== null ? parsed.data.costSek.toString() : null;
    }

    const [updated] = await db
      .update(serviceEvents)
      .set(updateData)
      .where(eq(serviceEvents.id, serviceId))
      .returning();

    await db.insert(activityLog).values({
      entityType: "service_event",
      entityId: serviceId,
      action: "updated",
      changes: { old: existing, new: parsed.data },
      performedBy: user.id,
    });

    revalidateTag("vehicles", "default");
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /services/[serviceId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { serviceId } = await params;

    const [existing] = await db
      .select()
      .from(serviceEvents)
      .where(eq(serviceEvents.id, serviceId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Service event not found" },
        { status: 404 }
      );
    }

    await db.insert(activityLog).values({
      entityType: "service_event",
      entityId: serviceId,
      action: "deleted",
      changes: {
        serviceType: existing.serviceType,
        date: existing.date,
        mileageAtService: existing.mileageAtService,
      },
      performedBy: user.id,
    });

    await db.delete(serviceEvents).where(eq(serviceEvents.id, serviceId));

    revalidateTag("vehicles", "default");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /services/[serviceId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
