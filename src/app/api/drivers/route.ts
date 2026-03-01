import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drivers, activityLog } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const createDriverSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(["admin", "driver"]).default("driver"),
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const [driver] = await db
      .insert(drivers)
      .values(parsed.data)
      .returning();

    // Log activity
    await db.insert(activityLog).values({
      entityType: "driver",
      entityId: driver.id,
      action: "created",
      changes: { name: parsed.data.name, email: parsed.data.email },
      performedBy: user.id,
    });

    return NextResponse.json(driver, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
