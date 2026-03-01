"use client";

import Link from "next/link";
import { Plus, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import type { Vehicle } from "@/db/schema";

type VehicleWithDriver = Vehicle & { driverName: string | null };

export function VehicleList({ vehicles }: { vehicles: VehicleWithDriver[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Fordon</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hantera fordonsflottan ({vehicles.length} fordon)
          </p>
        </div>
        <Link href="/vehicles/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Lägg till
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {vehicles.length === 0 ? (
            <EmptyState
              icon={Car}
              title="Inga fordon"
              description="Lägg till ditt första fordon för att komma igång."
              action={
                <Link href="/vehicles/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Lägg till fordon
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reg.nr</TableHead>
                      <TableHead>Fabrikat</TableHead>
                      <TableHead>Modell</TableHead>
                      <TableHead>Årsmodell</TableHead>
                      <TableHead>Bränsle</TableHead>
                      <TableHead>Förare</TableHead>
                      <TableHead className="text-right">Mätarst.</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell>
                          <Link
                            href={`/vehicles/${vehicle.id}`}
                            className="font-medium text-gray-900 hover:text-violet-600"
                          >
                            {vehicle.registrationNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-gray-600">{vehicle.make || "—"}</TableCell>
                        <TableCell className="text-gray-600">{vehicle.model || "—"}</TableCell>
                        <TableCell className="text-gray-500">{vehicle.modelYear || "—"}</TableCell>
                        <TableCell className="text-gray-500">{vehicle.fuelType || "—"}</TableCell>
                        <TableCell className="text-gray-500">
                          {vehicle.driverName || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-gray-600">
                          {vehicle.currentMileage.toLocaleString("sv-SE")} km
                        </TableCell>
                        <TableCell>
                          <Badge variant={vehicle.isActive ? "success" : "default"}>
                            {vehicle.isActive ? "Aktiv" : "Inaktiv"}
                          </Badge>
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
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {vehicle.registrationNumber}
                      </span>
                      <Badge variant={vehicle.isActive ? "success" : "default"}>
                        {vehicle.isActive ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {vehicle.make} {vehicle.model} {vehicle.modelYear}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {vehicle.currentMileage.toLocaleString("sv-SE")} km
                      {vehicle.driverName && ` · ${vehicle.driverName}`}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
