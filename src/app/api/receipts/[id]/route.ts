import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { receipts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  adminNote: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const [receipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, id))
      .limit(1);

    if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role !== "admin" && receipt.driverId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: signedData } = await supabaseAdmin.storage
      .from("receipts")
      .createSignedUrl(receipt.fileUrl, 3600);

    return NextResponse.json({ ...receipt, signedUrl: signedData?.signedUrl ?? null });
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
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const [updated] = await db
      .update(receipts)
      .set({
        status: parsed.data.status,
        adminNote: parsed.data.adminNote ?? null,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      })
      .where(eq(receipts.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
