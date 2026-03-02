import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings, activityLog } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSettingsSchema = z.object({
  companyName: z.string().max(200).optional(),
  notifyEmailEnabled: z.boolean().optional(),
  notifyEmail: z.string().email().optional().nullable(),
  thresholdServiceWarning: z.number().int().min(0).optional(),
  thresholdServiceCritical: z.number().int().min(0).optional(),
  thresholdInspectionWarning: z.number().int().min(0).optional(),
  thresholdInspectionCritical: z.number().int().min(0).optional(),
  emailDigestFrequency: z.enum(["daily", "weekly"]).optional(),
});

export async function GET() {
  await requireAdmin();

  const rows = await db.select().from(settings).limit(1);

  if (rows.length === 0) {
    const [row] = await db.insert(settings).values({}).returning();
    return NextResponse.json(row);
  }

  return NextResponse.json(rows[0]);
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin();

  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltiga data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const rows = await db.select().from(settings).limit(1);

  let row;
  if (rows.length === 0) {
    [row] = await db
      .insert(settings)
      .values({ ...parsed.data, updatedAt: new Date() })
      .returning();
  } else {
    [row] = await db
      .update(settings)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(settings.id, rows[0].id))
      .returning();
  }

  await db.insert(activityLog).values({
    entityType: "settings",
    entityId: row.id,
    action: "updated",
    changes: parsed.data,
    performedBy: user.id,
  });

  return NextResponse.json(row);
}
