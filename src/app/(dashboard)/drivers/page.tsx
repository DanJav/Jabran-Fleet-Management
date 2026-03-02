import { db } from "@/db";
import { drivers, vehicleAssignments, vehicles } from "@/db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { DriverList } from "@/components/drivers/driver-list";

export default async function DriversPage() {
  await requireAdmin();

  const allDrivers = await db.select().from(drivers).orderBy(drivers.name);

  const driverIds = allDrivers.map((d) => d.id);

  // Single batch query for all vehicle assignments
  const allAssignments = driverIds.length > 0
    ? await db
        .select({
          driverId: vehicleAssignments.driverId,
          registrationNumber: vehicles.registrationNumber,
          isPrimary: vehicleAssignments.isPrimary,
        })
        .from(vehicleAssignments)
        .innerJoin(vehicles, eq(vehicleAssignments.vehicleId, vehicles.id))
        .where(
          and(
            inArray(vehicleAssignments.driverId, driverIds),
            isNull(vehicleAssignments.unassignedAt)
          )
        )
    : [];

  // Group by driver
  const vehiclesByDriver = new Map<string, { registrationNumber: string; isPrimary: boolean }[]>();
  for (const a of allAssignments) {
    const list = vehiclesByDriver.get(a.driverId) ?? [];
    list.push({ registrationNumber: a.registrationNumber, isPrimary: a.isPrimary });
    vehiclesByDriver.set(a.driverId, list);
  }

  const driversWithVehicles = allDrivers.map((driver) => ({
    ...driver,
    assignedVehicles: vehiclesByDriver.get(driver.id) ?? [],
  }));

  return <DriverList drivers={driversWithVehicles} />;
}
