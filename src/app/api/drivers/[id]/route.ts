import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { drivers, activityLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const updateDriverSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(["admin", "driver"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
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

    const { password, ...dbFields } = parsed.data;

    // Sync Supabase Auth when password or isActive changes
    const needsAuthUpdate = password || typeof dbFields.isActive === "boolean";
    if (needsAuthUpdate) {
      if (!existing.authUserId) {
        return NextResponse.json({ error: "Driver has no linked auth account" }, { status: 400 });
      }
      const supabaseAdmin = createAdminClient();
      const authUpdate: { password?: string; ban_duration?: string } = {};
      if (password) authUpdate.password = password;
      if (typeof dbFields.isActive === "boolean") {
        // ban_duration "none" = unbanned; a long duration = effectively banned
        authUpdate.ban_duration = dbFields.isActive ? "none" : "876600h";
      }
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        existing.authUserId,
        authUpdate
      );
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }
    }

    const hasDbChanges = Object.keys(dbFields).length > 0;
    const [updated] = hasDbChanges
      ? await db.update(drivers).set(dbFields).where(eq(drivers.id, id)).returning()
      : await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);

    // Log activity
    await db.insert(activityLog).values({
      entityType: "driver",
      entityId: id,
      action: password ? "password_reset" : "updated",
      changes: password ? { passwordReset: true } : { old: existing, new: dbFields },
      performedBy: user.id,
    });

    revalidateTag("drivers", "default");
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/drivers/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
