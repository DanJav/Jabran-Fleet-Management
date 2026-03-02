import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { vehicles, serviceEvents, inspections, vehicleAssignments, drivers } from "@/db/schema";
import { eq, desc, isNull, and, inArray } from "drizzle-orm";
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

const getDashboardData = unstable_cache(
  async () => {
    const allVehicles = await db.select().from(vehicles).orderBy(vehicles.registrationNumber);
    const vehicleIds = allVehicles.map((v) => v.id);
    if (vehicleIds.length === 0) return { allVehicles, allServices: [], allInspections: [], allAssignments: [] };
    const [allServices, allInspections, allAssignments] = await Promise.all([
      db.select().from(serviceEvents).where(inArray(serviceEvents.vehicleId, vehicleIds)).orderBy(desc(serviceEvents.mileageAtService)),
      db.select().from(inspections).where(inArray(inspections.vehicleId, vehicleIds)).orderBy(desc(inspections.date)),
      db.select({ vehicleId: vehicleAssignments.vehicleId, driverId: vehicleAssignments.driverId, isPrimary: vehicleAssignments.isPrimary, driverName: drivers.name })
        .from(vehicleAssignments)
        .innerJoin(drivers, eq(vehicleAssignments.driverId, drivers.id))
        .where(and(inArray(vehicleAssignments.vehicleId, vehicleIds), isNull(vehicleAssignments.unassignedAt))),
    ]);
    return { allVehicles, allServices, allInspections, allAssignments };
  },
  ["dashboard-data"],
  { revalidate: 30, tags: ["vehicles", "drivers"] }
);

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isDriver = user.role === "driver";

  const { allVehicles, allServices, allInspections, allAssignments } = await getDashboardData();
  const vehicleIds = allVehicles.map((v) => v.id);

  if (vehicleIds.length === 0) {
    return (
      <DashboardContent
        vehicles={[]}
        totalActive={0}
        overdueCount={0}
        dueSoonCount={0}
        nextDeadline={null}
        isDriver={isDriver}
      />
    );
  }

  // Index by vehicleId for O(1) lookups
  const serviceAByVehicle = new Map<string, number>();
  const serviceBByVehicle = new Map<string, number>();
  for (const s of allServices) {
    if (s.serviceType === "A" && !serviceAByVehicle.has(s.vehicleId)) {
      serviceAByVehicle.set(s.vehicleId, s.mileageAtService);
    }
    if (s.serviceType === "B" && !serviceBByVehicle.has(s.vehicleId)) {
      serviceBByVehicle.set(s.vehicleId, s.mileageAtService);
    }
  }

  const besiktningByVehicle = new Map<string, string>();
  const taxameterByVehicle = new Map<string, string>();
  for (const i of allInspections) {
    if (i.inspectionType === "besiktning" && !besiktningByVehicle.has(i.vehicleId)) {
      besiktningByVehicle.set(i.vehicleId, i.nextDueDate);
    }
    if (i.inspectionType === "taxameter" && !taxameterByVehicle.has(i.vehicleId)) {
      taxameterByVehicle.set(i.vehicleId, i.nextDueDate);
    }
  }

  const driverByVehicle = new Map<string, string>();
  const driverAssignedVehicles = new Set<string>();
  for (const a of allAssignments) {
    if (a.isPrimary && !driverByVehicle.has(a.vehicleId)) {
      driverByVehicle.set(a.vehicleId, a.driverName);
    }
    if (isDriver && a.driverId === user.id) {
      driverAssignedVehicles.add(a.vehicleId);
    }
  }

  // Build vehicle status list
  const vehiclesWithStatus: VehicleWithStatus[] = [];

  for (const vehicle of allVehicles) {
    if (isDriver && !driverAssignedVehicles.has(vehicle.id)) continue;

    const serviceA = calculateServiceA(
      vehicle.currentMileage,
      serviceAByVehicle.get(vehicle.id) ?? null
    );
    const serviceB = calculateServiceB(
      vehicle.currentMileage,
      serviceBByVehicle.get(vehicle.id) ?? null
    );

    const besiktningNextDate = besiktningByVehicle.get(vehicle.id) ?? null;
    const taxameterNextDate = taxameterByVehicle.get(vehicle.id) ?? null;

    const besiktningDays = besiktningNextDate ? daysUntil(besiktningNextDate) : -1;
    const taxameterDays = taxameterNextDate ? daysUntil(taxameterNextDate) : -1;

    const besiktningStatus = besiktningNextDate ? getDateStatus(besiktningDays) : "overdue" as ServiceStatus;
    const taxameterStatus = taxameterNextDate ? getDateStatus(taxameterDays) : "overdue" as ServiceStatus;

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
      driverName: driverByVehicle.get(vehicle.id) ?? null,
      serviceAStatus: serviceA.status,
      serviceAKmRemaining: serviceA.km_remaining,
      serviceBStatus: serviceB.status,
      serviceBKmRemaining: serviceB.km_remaining,
      besiktningStatus,
      besiktningDaysRemaining: besiktningDays,
      besiktningNextDate,
      taxameterStatus,
      taxameterDaysRemaining: taxameterDays,
      taxameterNextDate,
      worstStatus,
    });
  }

  // Sort: active first, then by worst status
  const statusOrder: Record<ServiceStatus, number> = { overdue: 0, due_soon: 1, upcoming: 2 };
  vehiclesWithStatus.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return statusOrder[a.worstStatus] - statusOrder[b.worstStatus];
  });

  type NextDeadline = {
    vehicleReg: string;
    type: string;
    value: string;
    daysOrKm: number;
  } | null;

  let nextDeadline: NextDeadline = null;

  for (const v of vehiclesWithStatus) {
    if (!v.isActive) continue;
    const candidates = [
      { type: "Service A", value: `${v.serviceAKmRemaining.toLocaleString("sv-SE")} km`, daysOrKm: v.serviceAKmRemaining, vehicleReg: v.registrationNumber },
      { type: "Service B", value: `${v.serviceBKmRemaining.toLocaleString("sv-SE")} km`, daysOrKm: v.serviceBKmRemaining, vehicleReg: v.registrationNumber },
    ];
    if (v.besiktningNextDate) {
      candidates.push({ type: "Besiktning", value: `${v.besiktningDaysRemaining} dagar`, daysOrKm: v.besiktningDaysRemaining, vehicleReg: v.registrationNumber });
    }
    if (v.taxameterNextDate) {
      candidates.push({ type: "Taxameter", value: `${v.taxameterDaysRemaining} dagar`, daysOrKm: v.taxameterDaysRemaining, vehicleReg: v.registrationNumber });
    }
    for (const c of candidates) {
      if (!nextDeadline || c.daysOrKm < nextDeadline.daysOrKm) {
        nextDeadline = c;
      }
    }
  }

  const overdueCount = vehiclesWithStatus.filter((v) => v.worstStatus === "overdue").length;
  const dueSoonCount = vehiclesWithStatus.filter((v) => v.worstStatus === "due_soon").length;
  const totalActive = vehiclesWithStatus.filter((v) => v.isActive).length;

  return (
    <DashboardContent
      vehicles={vehiclesWithStatus}
      totalActive={totalActive}
      overdueCount={overdueCount}
      dueSoonCount={dueSoonCount}
      nextDeadline={nextDeadline ? { vehicleReg: nextDeadline.vehicleReg, type: nextDeadline.type, value: nextDeadline.value } : null}
      isDriver={isDriver}
    />
  );
}
