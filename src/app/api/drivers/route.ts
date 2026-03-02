import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drivers, activityLog } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// For drivers: username required, email optional
// For admins: email required, username optional
const createDriverSchema = z
  .object({
    name: z.string().min(1),
    username: z
      .string()
      .min(2)
      .max(50)
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        "Username may only contain letters, numbers, _, ., -"
      )
      .optional(),
    email: z.string().email().optional(),
    password: z.string().min(6),
    phone: z.string().optional(),
    role: z.enum(["admin", "driver"]).default("driver"),
  })
  .refine((d) => (d.role === "admin" ? !!d.email : !!d.username), {
    message: "Admin requires email; driver requires username",
  });

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const allDrivers = await db
      .select()
      .from(drivers)
      .orderBy(desc(drivers.createdAt));
    return NextResponse.json(allDrivers);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createDriverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, username, email, password, phone, role } = parsed.data;
    // Admins log in with their real email; drivers log in with username@fleet.local
    const authEmail =
      role === "admin" ? email! : `${username}@fleet.local`;

    // 1. Create Supabase auth user
    const supabaseAdmin = createAdminClient();
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
      });

    if (authError) {
      const isDuplicate = authError.message
        .toLowerCase()
        .includes("already");
      return NextResponse.json(
        {
          error: isDuplicate
            ? "Användarnamnet eller e-posten är redan tagen"
            : authError.message,
        },
        { status: isDuplicate ? 409 : 500 }
      );
    }

    // 2. Insert drivers row
    let driver;
    try {
      [driver] = await db
        .insert(drivers)
        .values({
          name,
          username: username ?? null,
          email: email ?? null,
          phone: phone || null,
          role,
          authUserId: authData.user.id,
        })
        .returning();
    } catch (dbError) {
      // Rollback: delete auth user if drivers insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw dbError;
    }

    // 3. Log activity
    await db.insert(activityLog).values({
      entityType: "driver",
      entityId: driver.id,
      action: "created",
      changes: { name, username, email, role },
      performedBy: user.id,
    });

    return NextResponse.json(driver, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
