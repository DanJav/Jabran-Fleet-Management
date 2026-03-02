import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes, activityLog, vehicleAssignments } from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const createNoteSchema = z.object({
  content: z.string().min(1).max(2000),
  tag: z.enum(["issue", "maintenance", "general"]).default("general"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id: vehicleId } = await params;

  if (user.role === "driver") {
    const [assignment] = await db
      .select()
      .from(vehicleAssignments)
      .where(
        and(
          eq(vehicleAssignments.vehicleId, vehicleId),
          eq(vehicleAssignments.driverId, user.id),
          isNull(vehicleAssignments.unassignedAt)
        )
      )
      .limit(1);
    if (!assignment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const vehicleNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.vehicleId, vehicleId))
    .orderBy(desc(notes.createdAt));

  return NextResponse.json(vehicleNotes);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id: vehicleId } = await params;

  if (user.role === "driver") {
    const [assignment] = await db
      .select()
      .from(vehicleAssignments)
      .where(
        and(
          eq(vehicleAssignments.vehicleId, vehicleId),
          eq(vehicleAssignments.driverId, user.id),
          isNull(vehicleAssignments.unassignedAt)
        )
      )
      .limit(1);
    if (!assignment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltiga data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [note] = await db
    .insert(notes)
    .values({
      vehicleId,
      authorId: user.id,
      content: parsed.data.content,
      tag: parsed.data.tag,
    })
    .returning();

  await db.insert(activityLog).values({
    entityType: "note",
    entityId: note.id,
    action: "created",
    changes: { content: parsed.data.content, tag: parsed.data.tag },
    performedBy: user.id,
  });

  return NextResponse.json(note, { status: 201 });
}
