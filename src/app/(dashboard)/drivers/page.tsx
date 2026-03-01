import { db } from "@/db";
import { drivers, vehicleAssignments, vehicles } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { DriverList } from "@/components/drivers/driver-list";

export default async function DriversPage() {
  await requireAdmin();

  const allDrivers = await db.select().from(drivers).orderBy(drivers.name);

  const driversWithVehicles = await Promise.all(
    allDrivers.map(async (driver) => {
      const assignedVehicles = await db
        .select({
          registrationNumber: vehicles.registrationNumber,
          isPrimary: vehicleAssignments.isPrimary,
        })
        .from(vehicleAssignments)
        .innerJoin(vehicles, eq(vehicleAssignments.vehicleId, vehicles.id))
        .where(
          and(
            eq(vehicleAssignments.driverId, driver.id),
            isNull(vehicleAssignments.unassignedAt)
          )
        );

      return {
        ...driver,
        assignedVehicles,
      };
    })
  );

  return <DriverList drivers={driversWithVehicles} />;
}
