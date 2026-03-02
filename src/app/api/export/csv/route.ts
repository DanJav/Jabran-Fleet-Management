import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  vehicles,
  serviceEvents,
  inspections,
  vehicleAssignments,
  drivers,
} from "@/db/schema";
import { eq, desc, isNull, and, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { calculateServiceA, calculateServiceB } from "@/lib/utils";

export async function GET() {
  await requireAdmin();

  const allVehicles = await db
    .select()
    .from(vehicles)
    .orderBy(vehicles.registrationNumber);

  const vehicleIds = allVehicles.map((v) => v.id);

  if (vehicleIds.length === 0) {
    const bom = "\uFEFF";
    const header =
      "Reg.nr;Fabrikat;Modell;Årsmodell;Mätarställning;Status;Service A (km kvar);Service B (km kvar);Besiktning (nästa datum);Taxameter (nästa datum);Förare";
    return new NextResponse(bom + header + "\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="fleet-export.csv"',
      },
    });
  }

  const [allServices, allInspections, allAssignments] = await Promise.all([
    db
      .select()
      .from(serviceEvents)
      .where(inArray(serviceEvents.vehicleId, vehicleIds))
      .orderBy(desc(serviceEvents.mileageAtService)),
    db
      .select()
      .from(inspections)
      .where(inArray(inspections.vehicleId, vehicleIds))
      .orderBy(desc(inspections.date)),
    db
      .select({
        vehicleId: vehicleAssignments.vehicleId,
        driverName: drivers.name,
      })
      .from(vehicleAssignments)
      .innerJoin(drivers, eq(vehicleAssignments.driverId, drivers.id))
      .where(
        and(
          inArray(vehicleAssignments.vehicleId, vehicleIds),
          isNull(vehicleAssignments.unassignedAt)
        )
      ),
  ]);

  // Index by vehicleId
  const servicesByVehicle = new Map<string, typeof allServices>();
  for (const s of allServices) {
    if (!servicesByVehicle.has(s.vehicleId)) {
      servicesByVehicle.set(s.vehicleId, []);
    }
    servicesByVehicle.get(s.vehicleId)!.push(s);
  }

  const inspectionsByVehicle = new Map<string, typeof allInspections>();
  for (const i of allInspections) {
    if (!inspectionsByVehicle.has(i.vehicleId)) {
      inspectionsByVehicle.set(i.vehicleId, []);
    }
    inspectionsByVehicle.get(i.vehicleId)!.push(i);
  }

  const assignmentsByVehicle = new Map<string, string>();
  for (const a of allAssignments) {
    assignmentsByVehicle.set(a.vehicleId, a.driverName);
  }

  const header =
    "Reg.nr;Fabrikat;Modell;Årsmodell;Mätarställning;Status;Service A (km kvar);Service B (km kvar);Besiktning (nästa datum);Taxameter (nästa datum);Förare";

  const rows = allVehicles.map((v) => {
    const vServices = servicesByVehicle.get(v.id) ?? [];
    const vInspections = inspectionsByVehicle.get(v.id) ?? [];

    const lastServiceA = vServices.find((s) => s.serviceType === "A");
    const lastServiceB = vServices.find((s) => s.serviceType === "B");

    const serviceA = calculateServiceA(
      v.currentMileage,
      lastServiceA?.mileageAtService ?? null
    );
    const serviceB = calculateServiceB(
      v.currentMileage,
      lastServiceB?.mileageAtService ?? null
    );

    const besiktning = vInspections.find(
      (i) => i.inspectionType === "besiktning"
    );
    const taxameter = vInspections.find(
      (i) => i.inspectionType === "taxameter"
    );

    const driverName = assignmentsByVehicle.get(v.id) ?? "";

    const escape = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(";") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      escape(v.registrationNumber),
      escape(v.make),
      escape(v.model),
      escape(v.modelYear),
      escape(v.currentMileage),
      escape(v.isActive ? "Aktiv" : "Inaktiv"),
      escape(serviceA.km_remaining),
      escape(serviceB.km_remaining),
      escape(besiktning?.nextDueDate ?? ""),
      escape(taxameter?.nextDueDate ?? ""),
      escape(driverName),
    ].join(";");
  });

  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].join("\n") + "\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fleet-export.csv"',
    },
  });
}
