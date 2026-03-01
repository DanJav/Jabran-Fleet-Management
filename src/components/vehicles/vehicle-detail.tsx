"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Gauge,
  Wrench,
  ClipboardCheck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calculateServiceA,
  calculateServiceB,
  daysUntil,
  getDateStatus,
  formatDate,
  formatMileage,
} from "@/lib/utils";
import type { Vehicle, ServiceEvent, Inspection, MileageLog } from "@/db/schema";

interface VehicleDetailProps {
  vehicle: Vehicle;
  services: ServiceEvent[];
  inspections: Inspection[];
  mileageHistory: MileageLog[];
  assignments: {
    id: string;
    isPrimary: boolean;
    assignedAt: Date;
    driverId: string;
    driverName: string;
    driverEmail: string;
  }[];
  allDrivers: { id: string; name: string }[];
  isAdmin: boolean;
}

export function VehicleDetail({
  vehicle,
  services,
  inspections,
  mileageHistory,
  assignments,
  allDrivers,
  isAdmin,
}: VehicleDetailProps) {
  const router = useRouter();

  // Calculate service status
  const lastServiceA = services.find((s) => s.serviceType === "A");
  const lastServiceB = services.find((s) => s.serviceType === "B");
  const serviceA = calculateServiceA(
    vehicle.currentMileage,
    lastServiceA?.mileageAtService ?? null
  );
  const serviceB = calculateServiceB(
    vehicle.currentMileage,
    lastServiceB?.mileageAtService ?? null
  );

  // Calculate inspection status
  const lastBesiktning = inspections.find((i) => i.inspectionType === "besiktning");
  const lastTaxameter = inspections.find((i) => i.inspectionType === "taxameter");

  const besiktningDays = lastBesiktning?.nextDueDate
    ? daysUntil(lastBesiktning.nextDueDate)
    : -1;
  const taxameterDays = lastTaxameter?.nextDueDate
    ? daysUntil(lastTaxameter.nextDueDate)
    : -1;

  const besiktningStatus = lastBesiktning ? getDateStatus(besiktningDays) : "overdue";
  const taxameterStatus = lastTaxameter ? getDateStatus(taxameterDays) : "overdue";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={isAdmin ? "/vehicles" : "/dashboard"}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {vehicle.registrationNumber}
            </h1>
            <p className="text-sm text-gray-500">
              {vehicle.make} {vehicle.model} {vehicle.modelYear}
              {vehicle.color && ` · ${vehicle.color}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={vehicle.isActive ? "success" : "default"}>
            {vehicle.isActive ? "Aktiv" : "Inaktiv"}
          </Badge>
        </div>
      </div>

      {/* Quick status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard
          label="Service A"
          sublabel={`Nästa vid ${formatMileage(serviceA.next_at_km)}`}
          value={`${formatMileage(serviceA.km_remaining)} kvar`}
          status={serviceA.status}
        />
        <StatusCard
          label="Service B"
          sublabel={`Nästa vid ${formatMileage(serviceB.next_at_km)}`}
          value={`${formatMileage(serviceB.km_remaining)} kvar`}
          status={serviceB.status}
        />
        <StatusCard
          label="Besiktning"
          sublabel={lastBesiktning?.nextDueDate ?? "Ej registrerad"}
          value={
            lastBesiktning
              ? `${besiktningDays} dagar kvar`
              : "Saknas"
          }
          status={besiktningStatus}
        />
        <StatusCard
          label="Taxameter"
          sublabel={lastTaxameter?.nextDueDate ?? "Ej registrerad"}
          value={
            lastTaxameter
              ? `${taxameterDays} dagar kvar`
              : "Saknas"
          }
          status={taxameterStatus}
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <LogMileageDialog vehicleId={vehicle.id} currentMileage={vehicle.currentMileage} />
        {isAdmin && (
          <>
            <LogServiceDialog vehicleId={vehicle.id} currentMileage={vehicle.currentMileage} />
            <LogInspectionDialog vehicleId={vehicle.id} />
            <AssignDriverDialog
              vehicleId={vehicle.id}
              allDrivers={allDrivers}
              currentAssignments={assignments}
            />
          </>
        )}
      </div>

      {/* Vehicle details card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fordonsinformation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Reg.nr" value={vehicle.registrationNumber} />
            <DetailRow label="VIN" value={vehicle.vin} />
            <DetailRow label="Fabrikat" value={vehicle.make} />
            <DetailRow label="Modell" value={vehicle.model} />
            <DetailRow label="Årsmodell" value={vehicle.modelYear?.toString()} />
            <DetailRow label="Färg" value={vehicle.color} />
            <DetailRow label="Bränsle" value={vehicle.fuelType} />
            <DetailRow
              label="Mätarställning"
              value={formatMileage(vehicle.currentMileage)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Taxameter / SUFT</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow
              label="Utrustning"
              value={vehicle.equipmentType === "taxameter" ? "Taxameter" : vehicle.equipmentType === "suft" ? "SUFT" : "Ingen"}
            />
            <DetailRow label="Fabrikat" value={vehicle.taxameterMake} />
            <DetailRow label="Typ" value={vehicle.taxameterType} />
            <DetailRow label="Serienr" value={vehicle.taxameterSerial} />
            <DetailRow label="Redovisningscentral" value={vehicle.redovisningscentral} />
          </CardContent>
        </Card>
      </div>

      {/* Assigned drivers */}
      {(isAdmin || assignments.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tilldelade förare</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-sm text-gray-500">Ingen förare tilldelad</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-900">{a.driverName}</span>
                      <span className="text-gray-500 ml-2">{a.driverEmail}</span>
                      {a.isPrimary && (
                        <Badge variant="accent" className="ml-2">
                          Primär
                        </Badge>
                      )}
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await fetch("/api/assignments", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ assignmentId: a.id }),
                          });
                          router.refresh();
                        }}
                      >
                        Ta bort
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Service history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Servicehistorik</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {services.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Ingen service registrerad</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Mätarst.</TableHead>
                  <TableHead>Utförd av</TableHead>
                  <TableHead>Kostnad</TableHead>
                  <TableHead>Anteckning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Badge variant="default">Service {s.serviceType}</Badge>
                    </TableCell>
                    <TableCell>{s.date}</TableCell>
                    <TableCell className="tabular-nums">
                      {s.mileageAtService.toLocaleString("sv-SE")} km
                    </TableCell>
                    <TableCell>{s.performedBy || "—"}</TableCell>
                    <TableCell>
                      {s.costSek ? `${Number(s.costSek).toLocaleString("sv-SE")} kr` : "—"}
                    </TableCell>
                    <TableCell className="text-gray-500 max-w-[200px] truncate">
                      {s.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Inspection history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Besiktningshistorik</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {inspections.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Ingen besiktning registrerad</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Nästa</TableHead>
                  <TableHead>Resultat</TableHead>
                  <TableHead>Utförd av</TableHead>
                  <TableHead>Avvikelse</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <Badge variant="default">
                        {i.inspectionType === "besiktning"
                          ? "Besiktning"
                          : i.inspectionType === "taxameter"
                          ? "Taxameter"
                          : "SUFT"}
                      </Badge>
                    </TableCell>
                    <TableCell>{i.date}</TableCell>
                    <TableCell>{i.nextDueDate}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          i.result === "approved"
                            ? "success"
                            : i.result === "failed"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {i.result === "approved"
                          ? "Godkänd"
                          : i.result === "failed"
                          ? "Underkänd"
                          : i.result === "approved_with_notes"
                          ? "Godkänd m. anm."
                          : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>{i.performedBy || "—"}</TableCell>
                    <TableCell className="text-gray-500 max-w-[200px] truncate">
                      {i.avvikelse || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Mileage history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Mätarhistorik</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {mileageHistory.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Ingen mätarställning registrerad</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Mätarst.</TableHead>
                  <TableHead>Källa</TableHead>
                  <TableHead>Anteckning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mileageHistory.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatDate(m.loggedAt)}</TableCell>
                    <TableCell className="tabular-nums">
                      {m.mileage.toLocaleString("sv-SE")} km
                    </TableCell>
                    <TableCell>{m.source === "manual" ? "Manuell" : "API"}</TableCell>
                    <TableCell className="text-gray-500">{m.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {vehicle.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Anteckningar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{vehicle.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value || "—"}</span>
    </div>
  );
}

function StatusCard({
  label,
  sublabel,
  value,
  status,
}: {
  label: string;
  sublabel: string;
  value: string;
  status: "upcoming" | "due_soon" | "overdue";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500">{label}</span>
          <StatusDot status={status} />
        </div>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>
      </CardContent>
    </Card>
  );
}

// === Dialog components ===

function LogMileageDialog({
  vehicleId,
  currentMileage,
}: {
  vehicleId: string;
  currentMileage: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/vehicles/${vehicleId}/mileage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mileage: parseInt(mileage),
        notes: notes || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Något gick fel");
      setLoading(false);
      return;
    }

    setOpen(false);
    setMileage("");
    setNotes("");
    setLoading(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Gauge className="h-4 w-4 mr-1" />
          Logga mätarställning
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Logga mätarställning</DialogTitle>
          <DialogDescription>
            Nuvarande: {formatMileage(currentMileage)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
          )}
          <div className="space-y-2">
            <Label>Ny mätarställning (km)</Label>
            <Input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              min={currentMileage}
              required
              autoFocus
              placeholder={`Minst ${currentMileage}`}
            />
          </div>
          <div className="space-y-2">
            <Label>Anteckning (valfri)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="T.ex. avläst vid besiktning"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sparar..." : "Spara"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LogServiceDialog({
  vehicleId,
  currentMileage,
}: {
  vehicleId: string;
  currentMileage: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serviceType, setServiceType] = useState<"A" | "B">("A");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [mileage, setMileage] = useState(currentMileage.toString());
  const [performedBy, setPerformedBy] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/vehicles/${vehicleId}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType,
        date,
        mileageAtService: parseInt(mileage),
        performedBy: performedBy || undefined,
        costSek: cost ? parseFloat(cost) : undefined,
        notes: notes || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Något gick fel");
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wrench className="h-4 w-4 mr-1" />
          Logga service
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Logga service</DialogTitle>
          <DialogDescription>Registrera en utförd service</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
          )}
          <div className="space-y-2">
            <Label>Servicetyp</Label>
            <Select
              value={serviceType}
              onValueChange={(v) => setServiceType(v as "A" | "B")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Service A (15 000 km)</SelectItem>
                <SelectItem value="B">Service B (30 000 km)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Mätarst. (km)</Label>
              <Input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Utförd av</Label>
              <Input
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
                placeholder="Verkstad"
              />
            </div>
            <div className="space-y-2">
              <Label>Kostnad (SEK)</Label>
              <Input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Anteckning</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Valfri anteckning"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sparar..." : "Spara service"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LogInspectionDialog({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [inspectionType, setInspectionType] = useState<
    "besiktning" | "taxameter" | "suft"
  >("besiktning");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [result, setResult] = useState<string>("approved");
  const [performedBy, setPerformedBy] = useState("");
  const [avvikelse, setAvvikelse] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/vehicles/${vehicleId}/inspections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspectionType,
        date,
        result: result || undefined,
        performedBy: performedBy || undefined,
        avvikelse: avvikelse || undefined,
        notes: notes || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Något gick fel");
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardCheck className="h-4 w-4 mr-1" />
          Logga besiktning
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Logga besiktning</DialogTitle>
          <DialogDescription>
            Registrera en utförd besiktning/inspektion
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
          )}
          <div className="space-y-2">
            <Label>Typ</Label>
            <Select
              value={inspectionType}
              onValueChange={(v) =>
                setInspectionType(v as "besiktning" | "taxameter" | "suft")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="besiktning">Besiktning</SelectItem>
                <SelectItem value="taxameter">Taxameter</SelectItem>
                <SelectItem value="suft">SUFT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Resultat</Label>
              <Select value={result} onValueChange={setResult}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Godkänd</SelectItem>
                  <SelectItem value="approved_with_notes">Godkänd m. anm.</SelectItem>
                  <SelectItem value="failed">Underkänd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Utförd av</Label>
            <Input
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
              placeholder="Organisation / person"
            />
          </div>
          {(inspectionType === "taxameter" || inspectionType === "suft") && (
            <div className="space-y-2">
              <Label>Avvikelse</Label>
              <Input
                value={avvikelse}
                onChange={(e) => setAvvikelse(e.target.value)}
                placeholder="Beskriv eventuella avvikelser"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Anteckning</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Valfri anteckning"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sparar..." : "Spara besiktning"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignDriverDialog({
  vehicleId,
  allDrivers,
  currentAssignments,
}: {
  vehicleId: string;
  allDrivers: { id: string; name: string }[];
  currentAssignments: { driverId: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [driverId, setDriverId] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const assignedIds = new Set(currentAssignments.map((a) => a.driverId));
  const availableDrivers = allDrivers.filter((d) => !assignedIds.has(d.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId, driverId, isPrimary }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Något gick fel");
      setLoading(false);
      return;
    }

    setOpen(false);
    setDriverId("");
    setLoading(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-1" />
          Tilldela förare
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tilldela förare</DialogTitle>
          <DialogDescription>Välj en förare att tilldela till detta fordon</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
          )}
          {availableDrivers.length === 0 ? (
            <p className="text-sm text-gray-500">
              Inga lediga förare. Skapa en ny förare först.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Förare</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj förare..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isPrimary">Primär förare</Label>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !driverId}>
                {loading ? "Sparar..." : "Tilldela"}
              </Button>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
