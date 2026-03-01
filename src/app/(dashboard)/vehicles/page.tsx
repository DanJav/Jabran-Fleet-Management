import { db } from "@/db";
import { vehicles, vehicleAssignments, drivers } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { VehicleList } from "@/components/vehicles/vehicle-list";

export default async function VehiclesPage() {
  await requireAdmin();

  const allVehicles = await db
    .select()
    .from(vehicles)
    .orderBy(vehicles.registrationNumber);

  // Get primary driver for each vehicle
  const vehiclesWithDrivers = await Promise.all(
    allVehicles.map(async (vehicle) => {
      const [assignment] = await db
        .select({ driverName: drivers.name })
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

      return {
        ...vehicle,
        driverName: assignment?.driverName ?? null,
      };
    })
  );

  return <VehicleList vehicles={vehiclesWithDrivers} />;
}
