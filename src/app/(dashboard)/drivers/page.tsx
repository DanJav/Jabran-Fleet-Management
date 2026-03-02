import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { drivers, vehicleAssignments, vehicles } from "@/db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { DriverList } from "@/components/drivers/driver-list";

const getDriversWithVehicles = unstable_cache(
  async () => {
    const allDrivers = await db
      .select()
      .from(drivers)
      .orderBy(drivers.name);

    const driverIds = allDrivers.map((d) => d.id);

    const allAssignments =
      driverIds.length > 0
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

    const vehiclesByDriver = new Map<
      string,
      { registrationNumber: string; isPrimary: boolean }[]
    >();
    for (const a of allAssignments) {
      const list = vehiclesByDriver.get(a.driverId) ?? [];
      list.push({ registrationNumber: a.registrationNumber, isPrimary: a.isPrimary });
      vehiclesByDriver.set(a.driverId, list);
    }

    return allDrivers.map((driver) => ({
      ...driver,
      assignedVehicles: vehiclesByDriver.get(driver.id) ?? [],
    }));
  },
  ["drivers-list"],
  { revalidate: 30, tags: ["drivers"] }
);

export default async function DriversPage() {
  await requireAdmin();
  const driversWithVehicles = await getDriversWithVehicles();
  return <DriverList drivers={driversWithVehicles} />;
}
