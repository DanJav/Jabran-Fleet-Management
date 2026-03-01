import { db } from "@/db";
import { vehicles, serviceEvents, inspections, vehicleAssignments, drivers } from "@/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { calculateServiceA, calculateServiceB, daysUntil, getDateStatus } from "@/lib/utils";
import type { ServiceStatus } from "@/lib/utils";

export type VehicleWithStatus = {
  id: string;
  registrationNumber: string;
  make: string | null;
  model: string | null;
  currentMileage: number;
  isActive: boolean;
  driverName: string | null;
  serviceAStatus: ServiceStatus;
  serviceAKmRemaining: number;
  serviceBStatus: ServiceStatus;
  serviceBKmRemaining: number;
  besiktningStatus: ServiceStatus;
  besiktningDaysRemaining: number;
  besiktningNextDate: string | null;
  taxameterStatus: ServiceStatus;
  taxameterDaysRemaining: number;
  taxameterNextDate: string | null;
  worstStatus: ServiceStatus;
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // For drivers, show only their assigned vehicles
  const isDriver = user.role === "driver";

  const allVehicles = await db.select().from(vehicles).orderBy(vehicles.registrationNumber);

  const vehiclesWithStatus: VehicleWithStatus[] = [];

  for (const vehicle of allVehicles) {
    if (!vehicle.isActive) continue;

    // If driver, check assignment
    if (isDriver) {
      const assignment = await db
        .select()
        .from(vehicleAssignments)
        .where(
          and(
            eq(vehicleAssignments.vehicleId, vehicle.id),
            eq(vehicleAssignments.driverId, user.id),
            isNull(vehicleAssignments.unassignedAt)
          )
        )
        .limit(1);
      if (assignment.length === 0) continue;
    }

    // Get last service events
    const [lastServiceA] = await db
      .select()
      .from(serviceEvents)
      .where(and(eq(serviceEvents.vehicleId, vehicle.id), eq(serviceEvents.serviceType, "A")))
      .orderBy(desc(serviceEvents.mileageAtService))
      .limit(1);

    const [lastServiceB] = await db
      .select()
      .from(serviceEvents)
      .where(and(eq(serviceEvents.vehicleId, vehicle.id), eq(serviceEvents.serviceType, "B")))
      .orderBy(desc(serviceEvents.mileageAtService))
      .limit(1);

    // Get latest inspections
    const [lastBesiktning] = await db
      .select()
      .from(inspections)
      .where(and(eq(inspections.vehicleId, vehicle.id), eq(inspections.inspectionType, "besiktning")))
      .orderBy(desc(inspections.date))
      .limit(1);

    const [lastTaxameter] = await db
      .select()
      .from(inspections)
      .where(and(eq(inspections.vehicleId, vehicle.id), eq(inspections.inspectionType, "taxameter")))
      .orderBy(desc(inspections.date))
      .limit(1);

    // Get assigned driver
    const [assignment] = await db
      .select({ driver: drivers })
      .from(vehicleAssignments)
      .innerJoin(drivers, eq(vehicleAssignments.driverId, drivers.id))
      .where(
        and(
          eq(vehicleAssignments.vehicleId, vehicle.id),
          eq(vehicleAssignments.isPrimary, true),
          isNull(vehicleAssignments.unassignedAt)
        )
      )
      .limit(1);

    const serviceA = calculateServiceA(
      vehicle.currentMileage,
      lastServiceA?.mileageAtService ?? null
    );
    const serviceB = calculateServiceB(
      vehicle.currentMileage,
      lastServiceB?.mileageAtService ?? null
    );

    const besiktningDays = lastBesiktning?.nextDueDate
      ? daysUntil(lastBesiktning.nextDueDate)
      : -1;
    const taxameterDays = lastTaxameter?.nextDueDate
      ? daysUntil(lastTaxameter.nextDueDate)
      : -1;

    const besiktningStatus = lastBesiktning ? getDateStatus(besiktningDays) : "overdue" as ServiceStatus;
    const taxameterStatus = lastTaxameter ? getDateStatus(taxameterDays) : "overdue" as ServiceStatus;

    // Determine worst status
    const statuses = [serviceA.status, serviceB.status, besiktningStatus, taxameterStatus];
    const worstStatus: ServiceStatus = statuses.includes("overdue")
      ? "overdue"
      : statuses.includes("due_soon")
      ? "due_soon"
      : "upcoming";

    vehiclesWithStatus.push({
      id: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      make: vehicle.make,
      model: vehicle.model,
      currentMileage: vehicle.currentMileage,
      isActive: vehicle.isActive,
      driverName: assignment?.driver?.name ?? null,
      serviceAStatus: serviceA.status,
      serviceAKmRemaining: serviceA.km_remaining,
      serviceBStatus: serviceB.status,
      serviceBKmRemaining: serviceB.km_remaining,
      besiktningStatus,
      besiktningDaysRemaining: besiktningDays,
      besiktningNextDate: lastBesiktning?.nextDueDate ?? null,
      taxameterStatus,
      taxameterDaysRemaining: taxameterDays,
      taxameterNextDate: lastTaxameter?.nextDueDate ?? null,
      worstStatus,
    });
  }

  // Sort: overdue first, then due_soon, then upcoming
  const statusOrder: Record<ServiceStatus, number> = { overdue: 0, due_soon: 1, upcoming: 2 };
  vehiclesWithStatus.sort((a, b) => statusOrder[a.worstStatus] - statusOrder[b.worstStatus]);

  const overdueCount = vehiclesWithStatus.filter((v) => v.worstStatus === "overdue").length;
  const dueSoonCount = vehiclesWithStatus.filter((v) => v.worstStatus === "due_soon").length;
  const totalActive = vehiclesWithStatus.length;

  return (
    <DashboardContent
      vehicles={vehiclesWithStatus}
      totalActive={totalActive}
      overdueCount={overdueCount}
      dueSoonCount={dueSoonCount}
      isDriver={isDriver}
    />
  );
}
