import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { vehicles, vehicleAssignments } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { DriverReceipts } from "@/components/receipts/driver-receipts";
import { AdminReceipts } from "@/components/receipts/admin-receipts";

export default async function ReceiptsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "admin") {
    return <AdminReceipts />;
  }

  const assignedVehicles = await db
    .select({
      id: vehicles.id,
      registrationNumber: vehicles.registrationNumber,
      make: vehicles.make,
      model: vehicles.model,
    })
    .from(vehicleAssignments)
    .innerJoin(vehicles, eq(vehicleAssignments.vehicleId, vehicles.id))
    .where(
      and(
        eq(vehicleAssignments.driverId, user.id),
        isNull(vehicleAssignments.unassignedAt)
      )
    );

  return <DriverReceipts assignedVehicles={assignedVehicles} />;
}
