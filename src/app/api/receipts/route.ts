import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { receipts, drivers, vehicles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const submitSchema = z.object({
  category: z.enum(["fuel", "parking", "tolls", "repairs", "service", "other"]),
  vehicleId: z.string().uuid().optional().nullable(),
  amount: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  fileName: z.string().min(1),
  fileBase64: z.string().min(1),
  fileType: z.string().min(1),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role === "admin") {
      const allReceipts = await db
        .select({
          id: receipts.id,
          category: receipts.category,
          amount: receipts.amount,
          notes: receipts.notes,
          fileName: receipts.fileName,
          fileUrl: receipts.fileUrl,
          status: receipts.status,
          adminNote: receipts.adminNote,
          submittedAt: receipts.submittedAt,
          reviewedAt: receipts.reviewedAt,
          vehicleId: receipts.vehicleId,
          driverId: receipts.driverId,
          driverName: drivers.name,
          registrationNumber: vehicles.registrationNumber,
        })
        .from(receipts)
        .leftJoin(drivers, eq(receipts.driverId, drivers.id))
        .leftJoin(vehicles, eq(receipts.vehicleId, vehicles.id))
        .orderBy(desc(receipts.submittedAt));
      return NextResponse.json(allReceipts);
    } else {
      const myReceipts = await db
        .select({
          id: receipts.id,
          category: receipts.category,
          amount: receipts.amount,
          notes: receipts.notes,
          fileName: receipts.fileName,
          fileUrl: receipts.fileUrl,
          status: receipts.status,
          adminNote: receipts.adminNote,
          submittedAt: receipts.submittedAt,
          reviewedAt: receipts.reviewedAt,
          vehicleId: receipts.vehicleId,
          registrationNumber: vehicles.registrationNumber,
        })
        .from(receipts)
        .leftJoin(vehicles, eq(receipts.vehicleId, vehicles.id))
        .where(eq(receipts.driverId, user.id))
        .orderBy(desc(receipts.submittedAt));
      return NextResponse.json(myReceipts);
    }
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { category, vehicleId, amount, notes, fileName, fileBase64, fileType } = parsed.data;

    const supabaseAdmin = createAdminClient();
    const ext = fileName.split(".").pop() ?? "bin";
    const storagePath = `${user.authUserId}/${crypto.randomUUID()}.${ext}`;
    const fileBuffer = Buffer.from(fileBase64, "base64");

    const { error: uploadError } = await supabaseAdmin.storage
      .from("receipts")
      .upload(storagePath, fileBuffer, { contentType: fileType, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: "File upload failed" }, { status: 500 });
    }

    const [receipt] = await db
      .insert(receipts)
      .values({
        driverId: user.id,
        vehicleId: vehicleId ?? null,
        category,
        amount: amount ?? null,
        notes: notes ?? null,
        fileUrl: storagePath,
        fileName,
      })
      .returning();

    return NextResponse.json(receipt, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
