import { db } from "@/db";
import { drivers, vehicleAssignments, vehicles, activityLog, receipts } from "@/db/schema";
import { eq, desc, and, isNull, isNotNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { notFound } from "next/navigation";
import { DriverDetail } from "@/components/drivers/driver-detail";

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  // Fetch driver
  const [driver] = await db
    .select()
    .from(drivers)
    .where(eq(drivers.id, id))
    .limit(1);

  if (!driver) notFound();

  // Current assignments (no unassignedAt)
  const currentAssignments = await db
    .select({
      id: vehicleAssignments.id,
      isPrimary: vehicleAssignments.isPrimary,
      assignedAt: vehicleAssignments.assignedAt,
      vehicleId: vehicles.id,
      registrationNumber: vehicles.registrationNumber,
      make: vehicles.make,
      model: vehicles.model,
    })
    .from(vehicleAssignments)
    .innerJoin(vehicles, eq(vehicleAssignments.vehicleId, vehicles.id))
    .where(
      and(eq(vehicleAssignments.driverId, id), isNull(vehicleAssignments.unassignedAt))
    );

  // Past assignments (unassignedAt is set)
  const pastAssignments = await db
    .select({
      id: vehicleAssignments.id,
      isPrimary: vehicleAssignments.isPrimary,
      assignedAt: vehicleAssignments.assignedAt,
      unassignedAt: vehicleAssignments.unassignedAt,
      vehicleId: vehicles.id,
      registrationNumber: vehicles.registrationNumber,
      make: vehicles.make,
      model: vehicles.model,
    })
    .from(vehicleAssignments)
    .innerJoin(vehicles, eq(vehicleAssignments.vehicleId, vehicles.id))
    .where(
      and(eq(vehicleAssignments.driverId, id), isNotNull(vehicleAssignments.unassignedAt))
    )
    .orderBy(desc(vehicleAssignments.unassignedAt));

  // Activity log for this driver
  const activityEntries = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      createdAt: activityLog.createdAt,
      performedByName: drivers.name,
    })
    .from(activityLog)
    .leftJoin(drivers, eq(activityLog.performedBy, drivers.id))
    .where(
      and(
        eq(activityLog.entityType, "driver"),
        eq(activityLog.entityId, id)
      )
    )
    .orderBy(desc(activityLog.createdAt));

  // Receipts for this driver
  const driverReceipts = await db
    .select({
      id: receipts.id,
      category: receipts.category,
      amount: receipts.amount,
      notes: receipts.notes,
      fileName: receipts.fileName,
      status: receipts.status,
      adminNote: receipts.adminNote,
      submittedAt: receipts.submittedAt,
      registrationNumber: vehicles.registrationNumber,
    })
    .from(receipts)
    .leftJoin(vehicles, eq(receipts.vehicleId, vehicles.id))
    .where(eq(receipts.driverId, id))
    .orderBy(desc(receipts.submittedAt));

  return (
    <DriverDetail
      driver={driver}
      currentAssignments={currentAssignments}
      pastAssignments={pastAssignments}
      activityEntries={activityEntries}
      driverReceipts={driverReceipts}
    />
  );
}
