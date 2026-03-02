"use client";

import Link from "next/link";
import { Car, AlertTriangle, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { VehicleWithStatus } from "@/app/(dashboard)/dashboard/page";

interface DashboardContentProps {
  vehicles: VehicleWithStatus[];
  totalActive: number;
  overdueCount: number;
  dueSoonCount: number;
  nextDeadline: {
    vehicleReg: string;
    type: string;
    value: string;
  } | null;
  isDriver: boolean;
}

export function DashboardContent({
  vehicles,
  totalActive,
  overdueCount,
  dueSoonCount,
  nextDeadline,
  isDriver,
}: DashboardContentProps) {
  return (
    <div className="space-y-6">
      {isDriver && (() => {
        const alerts: { reg: string; item: string; status: "overdue" | "due_soon" }[] = [];
        for (const v of vehicles) {
          if (v.serviceAStatus === "overdue") alerts.push({ reg: v.registrationNumber, item: "Service A", status: "overdue" });
          if (v.serviceBStatus === "overdue") alerts.push({ reg: v.registrationNumber, item: "Service B", status: "overdue" });
          if (v.besiktningStatus === "overdue") alerts.push({ reg: v.registrationNumber, item: "Besiktning", status: "overdue" });
          if (v.taxameterStatus === "overdue") alerts.push({ reg: v.registrationNumber, item: "Taxameter", status: "overdue" });
          if (v.besiktningDaysRemaining >= 0 && v.besiktningDaysRemaining <= 14 && v.besiktningStatus !== "overdue")
            alerts.push({ reg: v.registrationNumber, item: `Besiktning (${v.besiktningDaysRemaining}d)`, status: "due_soon" });
          if (v.taxameterDaysRemaining >= 0 && v.taxameterDaysRemaining <= 14 && v.taxameterStatus !== "overdue")
            alerts.push({ reg: v.registrationNumber, item: `Taxameter (${v.taxameterDaysRemaining}d)`, status: "due_soon" });
          if (v.serviceAKmRemaining > 0 && v.serviceAKmRemaining <= 1000 && v.serviceAStatus !== "overdue")
            alerts.push({ reg: v.registrationNumber, item: `Service A (${v.serviceAKmRemaining.toLocaleString("sv-SE")} km)`, status: "due_soon" });
          if (v.serviceBKmRemaining > 0 && v.serviceBKmRemaining <= 1000 && v.serviceBStatus !== "overdue")
            alerts.push({ reg: v.registrationNumber, item: `Service B (${v.serviceBKmRemaining.toLocaleString("sv-SE")} km)`, status: "due_soon" });
        }
        const overdueAlerts = alerts.filter(a => a.status === "overdue");
        const soonAlerts = alerts.filter(a => a.status === "due_soon");
        if (alerts.length === 0) return null;
        return (
          <div className="space-y-2">
            {overdueAlerts.length > 0 && (
              <div className="rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200/60">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-[13px] font-medium text-red-800">
                    Försenat: {overdueAlerts.map(a => `${a.reg} — ${a.item}`).join(", ")}
                  </p>
                </div>
              </div>
            )}
            {soonAlerts.length > 0 && (
              <div className="rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-200/60">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-[13px] font-medium text-amber-800">
                    Snart: {soonAlerts.map(a => `${a.reg} — ${a.item}`).join(", ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
          {isDriver ? "Mina fordon" : "Översikt"}
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          {isDriver ? "Status för dina tilldelade fordon" : "Fordonsflottans status"}
        </p>
      </div>

      {/* Summary cards */}
      {!isDriver && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={Car}
            label="Aktiva fordon"
            value={totalActive}
            iconColor="text-violet-600"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Försenade"
            value={overdueCount}
            iconColor="text-red-600"
            valueColor={overdueCount > 0 ? "text-red-600" : undefined}
          />
          <SummaryCard
            icon={Clock}
            label="Behöver åtgärd"
            value={dueSoonCount}
            iconColor="text-amber-600"
            valueColor={dueSoonCount > 0 ? "text-amber-600" : undefined}
          />
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gray-50 p-2">
                  <Calendar className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-500 tracking-wide">Nästa deadline</p>
                  {nextDeadline ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900">{nextDeadline.type}</p>
                      <p className="text-[11px] text-gray-400">{nextDeadline.vehicleReg} · {nextDeadline.value}</p>
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-gray-900">Inga kommande</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vehicle table (desktop) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] font-medium text-gray-700">
            {isDriver ? "Fordon" : "Alla fordon"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reg.nr</TableHead>
                  <TableHead>Fordon</TableHead>
                  <TableHead>Status</TableHead>
                  {!isDriver && <TableHead>Förare</TableHead>}
                  <TableHead className="text-right">Mätarst.</TableHead>
                  <TableHead>Service A</TableHead>
                  <TableHead>Service B</TableHead>
                  <TableHead>Besiktning</TableHead>
                  <TableHead>Taxameter</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/vehicles/${vehicle.id}`}
                        className="font-medium text-gray-900 hover:text-violet-600"
                      >
                        {vehicle.registrationNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {vehicle.make} {vehicle.model}
                    </TableCell>
                    <TableCell>
                      <Badge variant={vehicle.isActive ? "success" : "default"}>
                        {vehicle.isActive ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </TableCell>
                    {!isDriver && (
                      <TableCell className="text-gray-500">
                        {vehicle.driverName || "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-right tabular-nums">
                      {vehicle.currentMileage.toLocaleString("sv-SE")} km
                    </TableCell>
                    <TableCell>
                      <StatusDot status={vehicle.serviceAStatus} />
                      <span className="ml-1 text-xs text-gray-500 tabular-nums">
                        {vehicle.serviceAKmRemaining.toLocaleString("sv-SE")} km
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusDot status={vehicle.serviceBStatus} />
                      <span className="ml-1 text-xs text-gray-500 tabular-nums">
                        {vehicle.serviceBKmRemaining.toLocaleString("sv-SE")} km
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusDot status={vehicle.besiktningStatus} />
                      <span className="ml-1 text-xs text-gray-500">
                        {vehicle.besiktningNextDate
                          ? `${vehicle.besiktningDaysRemaining}d`
                          : "Saknas"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusDot status={vehicle.taxameterStatus} />
                      <span className="ml-1 text-xs text-gray-500">
                        {vehicle.taxameterNextDate
                          ? `${vehicle.taxameterDaysRemaining}d`
                          : "Saknas"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {vehicles.map((vehicle) => (
              <Link
                key={vehicle.id}
                href={`/vehicles/${vehicle.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {vehicle.registrationNumber}
                    </span>
                    {!vehicle.isActive && (
                      <Badge variant="default">Inaktiv</Badge>
                    )}
                    <Badge
                      variant={
                        vehicle.worstStatus === "overdue"
                          ? "danger"
                          : vehicle.worstStatus === "due_soon"
                          ? "warning"
                          : "success"
                      }
                    >
                      {vehicle.worstStatus === "overdue"
                        ? "Försenad"
                        : vehicle.worstStatus === "due_soon"
                        ? "Snart"
                        : "OK"}
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-500 tabular-nums">
                    {vehicle.currentMileage.toLocaleString("sv-SE")} km
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {vehicle.make} {vehicle.model}
                </p>
                {!isDriver && vehicle.driverName && (
                  <p className="text-xs text-gray-400 mt-1">{vehicle.driverName}</p>
                )}
                <div className="mt-2 flex gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <StatusDot status={vehicle.serviceAStatus} showLabel={false} />
                    A: {vehicle.serviceAKmRemaining.toLocaleString("sv-SE")} km
                  </span>
                  <span className="flex items-center gap-1">
                    <StatusDot status={vehicle.serviceBStatus} showLabel={false} />
                    B: {vehicle.serviceBKmRemaining.toLocaleString("sv-SE")} km
                  </span>
                  <span className="flex items-center gap-1">
                    <StatusDot status={vehicle.besiktningStatus} showLabel={false} />
                    Bes: {vehicle.besiktningNextDate ? `${vehicle.besiktningDaysRemaining}d` : "—"}
                  </span>
                </div>
              </Link>
            ))}
            {vehicles.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">
                Inga fordon att visa
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  iconColor,
  valueColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  iconColor: string;
  valueColor?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-50 p-2">
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500 tracking-wide">{label}</p>
            <p className={`text-xl font-semibold tabular-nums ${valueColor || "text-gray-900"}`}>
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
