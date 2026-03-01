import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drivers, activityLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const updateDriverSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(["admin", "driver"]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const [driver] = await db
      .select()
      .from(drivers)
      .where(eq(drivers.id, id))
      .limit(1);

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json(driver);
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
    const parsed = updateDriverSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(drivers)
      .where(eq(drivers.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(drivers)
      .set(parsed.data)
      .where(eq(drivers.id, id))
      .returning();

    // Log activity
    await db.insert(activityLog).values({
      entityType: "driver",
      entityId: id,
      action: "updated",
      changes: { old: existing, new: parsed.data },
      performedBy: user.id,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
