import { db } from "@/db";
import { vehicles, vehicleAssignments, drivers } from "@/db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { VehicleList } from "@/components/vehicles/vehicle-list";

export default async function VehiclesPage() {
  await requireAdmin();

  const allVehicles = await db
    .select()
    .from(vehicles)
    .orderBy(vehicles.registrationNumber);

  const vehicleIds = allVehicles.map((v) => v.id);

  // Single batch query for all primary driver assignments
  const assignments = vehicleIds.length > 0
    ? await db
        .select({
          vehicleId: vehicleAssignments.vehicleId,
          driverName: drivers.name,
        })
        .from(vehicleAssignments)
        .innerJoin(drivers, eq(vehicleAssignments.driverId, drivers.id))
        .where(
          and(
            inArray(vehicleAssignments.vehicleId, vehicleIds),
            eq(vehicleAssignments.isPrimary, true),
            isNull(vehicleAssignments.unassignedAt)
          )
        )
    : [];

  const driverByVehicle = new Map(assignments.map((a) => [a.vehicleId, a.driverName]));

  const vehiclesWithDrivers = allVehicles.map((vehicle) => ({
    ...vehicle,
    driverName: driverByVehicle.get(vehicle.id) ?? null,
  }));

  return <VehicleList vehicles={vehiclesWithDrivers} />;
}
