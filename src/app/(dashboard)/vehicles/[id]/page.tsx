import { db } from "@/db";
import { vehicles, serviceEvents, inspections, mileageLogs, vehicleAssignments, drivers, notes as notesTable } from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { VehicleDetail } from "@/components/vehicles/vehicle-detail";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1);

  if (!vehicle) notFound();

  // Drivers can only access vehicles assigned to them
  if (user.role !== "admin") {
    const [assignment] = await db
      .select({ id: vehicleAssignments.id })
      .from(vehicleAssignments)
      .where(
        and(
          eq(vehicleAssignments.vehicleId, id),
          eq(vehicleAssignments.driverId, user.id),
          isNull(vehicleAssignments.unassignedAt)
        )
      )
      .limit(1);
    if (!assignment) notFound();
  }

  // Get service events
  const services = await db
    .select()
    .from(serviceEvents)
    .where(eq(serviceEvents.vehicleId, id))
    .orderBy(desc(serviceEvents.date));

  // Get inspections
  const vehicleInspections = await db
    .select()
    .from(inspections)
    .where(eq(inspections.vehicleId, id))
    .orderBy(desc(inspections.date));

  // Get mileage history
  const mileageHistory = await db
    .select()
    .from(mileageLogs)
    .where(eq(mileageLogs.vehicleId, id))
    .orderBy(desc(mileageLogs.loggedAt))
    .limit(50);

  // Get notes
  const vehicleNotes = await db
    .select({
      id: notesTable.id,
      content: notesTable.content,
      tag: notesTable.tag,
      createdAt: notesTable.createdAt,
      authorId: notesTable.authorId,
      authorName: drivers.name,
    })
    .from(notesTable)
    .leftJoin(drivers, eq(notesTable.authorId, drivers.id))
    .where(eq(notesTable.vehicleId, id))
    .orderBy(desc(notesTable.createdAt));

  // Get assigned drivers
  const assignments = await db
    .select({
      id: vehicleAssignments.id,
      isPrimary: vehicleAssignments.isPrimary,
      assignedAt: vehicleAssignments.assignedAt,
      driverId: drivers.id,
      driverName: drivers.name,
      driverEmail: drivers.email,
    })
    .from(vehicleAssignments)
    .innerJoin(drivers, eq(vehicleAssignments.driverId, drivers.id))
    .where(
      and(eq(vehicleAssignments.vehicleId, id), isNull(vehicleAssignments.unassignedAt))
    );

  // Get all drivers for assignment dropdown (admin only)
  let allDrivers: { id: string; name: string }[] = [];
  if (user.role === "admin") {
    allDrivers = await db
      .select({ id: drivers.id, name: drivers.name })
      .from(drivers)
      .where(eq(drivers.isActive, true))
      .orderBy(drivers.name);
  }

  return (
    <VehicleDetail
      vehicle={vehicle}
      services={services}
      inspections={vehicleInspections}
      mileageHistory={mileageHistory}
      assignments={assignments}
      allDrivers={allDrivers}
      vehicleNotes={vehicleNotes}
      isAdmin={user.role === "admin"}
    />
  );
}
