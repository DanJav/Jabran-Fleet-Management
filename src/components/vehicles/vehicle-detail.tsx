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
  MessageSquare,
  Trash2,
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
    driverEmail: string | null;
  }[];
  vehicleNotes: {
    id: string;
    content: string;
    tag: string;
    createdAt: Date;
    authorId: string | null;
    authorName: string | null;
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
  vehicleNotes,
  allDrivers,
  isAdmin,
}: VehicleDetailProps) {
  const router = useRouter();
  const [togglingActive, setTogglingActive] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggleActive = async () => {
    setTogglingActive(true);
    await fetch(`/api/vehicles/${vehicle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !vehicle.isActive }),
    });
    setTogglingActive(false);
    router.refresh();
  };

  const handleDelete = async () => {
    setDeletingVehicle(true);
    const res = await fetch(`/api/vehicles/${vehicle.id}`, { method: "DELETE" });
    setDeletingVehicle(false);
    if (res.ok) router.push("/vehicles");
  };

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
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
              {vehicle.registrationNumber}
            </h1>
            <p className="text-[13px] text-gray-500">
              {vehicle.make} {vehicle.model} {vehicle.modelYear}
              {vehicle.color && ` · ${vehicle.color}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={vehicle.isActive ? "success" : "default"}>
            {vehicle.isActive ? "Aktiv" : "Inaktiv"}
          </Badge>
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleActive}
                disabled={togglingActive}
              >
                {vehicle.isActive ? "Inaktivera" : "Aktivera"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
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

      {/* Unified timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tidslinje</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            type TimelineEvent = {
              id: string;
              type: "service" | "inspection" | "mileage" | "note";
              date: Date;
              title: string;
              detail: string;
            };

            const events: TimelineEvent[] = [
              ...services.map((s) => ({
                id: s.id,
                type: "service" as const,
                date: new Date(s.date),
                title: `Service ${s.serviceType}`,
                detail: `${s.mileageAtService.toLocaleString("sv-SE")} km${s.performedBy ? ` · ${s.performedBy}` : ""}`,
              })),
              ...inspections.map((i) => ({
                id: i.id,
                type: "inspection" as const,
                date: new Date(i.date),
                title: i.inspectionType === "besiktning" ? "Besiktning" : i.inspectionType === "taxameter" ? "Taxameter" : "SUFT",
                detail: i.result === "approved" ? "Godkänd" : i.result === "failed" ? "Underkänd" : i.result === "approved_with_notes" ? "Godkänd m. anm." : "",
              })),
              ...mileageHistory.map((m) => ({
                id: m.id,
                type: "mileage" as const,
                date: new Date(m.loggedAt),
                title: "Mätaravläsning",
                detail: `${m.mileage.toLocaleString("sv-SE")} km`,
              })),
              ...vehicleNotes.map((n) => ({
                id: n.id,
                type: "note" as const,
                date: new Date(n.createdAt),
                title: n.tag === "issue" ? "Problem" : n.tag === "maintenance" ? "Underhåll" : "Anteckning",
                detail: n.content.length > 80 ? n.content.slice(0, 80) + "\u2026" : n.content,
              })),
            ];

            events.sort((a, b) => b.date.getTime() - a.date.getTime());
            const recent = events.slice(0, 20);

            if (recent.length === 0) {
              return <p className="text-sm text-gray-500">Ingen aktivitet registrerad</p>;
            }

            const typeStyles: Record<string, string> = {
              service: "bg-blue-100 text-blue-700",
              inspection: "bg-violet-100 text-violet-700",
              mileage: "bg-gray-100 text-gray-700",
              note: "bg-amber-100 text-amber-700",
            };

            const typeLabels: Record<string, string> = {
              service: "Service",
              inspection: "Besikt.",
              mileage: "Mätare",
              note: "Notering",
            };

            return (
              <div className="space-y-3">
                {recent.map((event) => (
                  <div key={`${event.type}-${event.id}`} className="flex items-start gap-3">
                    <span className={`text-[11px] rounded-md px-1.5 py-0.5 font-medium shrink-0 ${typeStyles[event.type]}`}>
                      {typeLabels[event.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-medium text-gray-900">{event.title}</p>
                        <span className="text-[11px] text-gray-400 shrink-0 ml-2">{formatDate(event.date)}</span>
                      </div>
                      <p className="text-[12px] text-gray-500 truncate">{event.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

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
        <CardContent className="p-0 pl-2">
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
        <CardContent className="p-0 pl-2">
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
        <CardContent className="p-0 pl-2">
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

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Radera fordon</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill radera <strong>{vehicle.registrationNumber}</strong>? Detta går inte att ångra och all historik tas bort permanent.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletingVehicle}
            >
              {deletingVehicle ? "Raderar..." : "Radera fordon"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Anteckningar</CardTitle>
          <AddNoteDialog vehicleId={vehicle.id} />
        </CardHeader>
        <CardContent>
          {vehicleNotes.length === 0 ? (
            <p className="text-sm text-gray-500">Inga anteckningar</p>
          ) : (
            <div className="space-y-3">
              {vehicleNotes.map((note) => (
                <div key={note.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={note.tag === "issue" ? "danger" : note.tag === "maintenance" ? "warning" : "default"}>
                      {note.tag === "issue" ? "Problem" : note.tag === "maintenance" ? "Underhåll" : "Allmänt"}
                    </Badge>
                    <span className="text-[11px] text-gray-400">
                      {note.authorName || "Okänd"} · {formatDate(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-700">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100/80 last:border-0">
      <span className="text-[13px] text-gray-500">{label}</span>
      <span className="text-[13px] font-medium text-gray-900">{value || "—"}</span>
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
          <span className="text-[11px] font-medium text-gray-500 tracking-wide">{label}</span>
          <StatusDot status={status} />
        </div>
        <p className="text-[13px] font-semibold text-gray-900">{value}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{sublabel}</p>
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
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
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
        loggedAt: date,
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
    setDate(new Date().toISOString().split("T")[0]);
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
            <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200/60">{error}</p>
          )}
          <div className="space-y-2">
            <Label>Datum</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
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
            <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200/60">{error}</p>
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
            <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200/60">{error}</p>
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

function AddNoteDialog({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [tag, setTag] = useState<"general" | "issue" | "maintenance">("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/vehicles/${vehicleId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, tag }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Något gick fel");
      setLoading(false);
      return;
    }

    setOpen(false);
    setContent("");
    setTag("general");
    setLoading(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquare className="h-4 w-4 mr-1" />
          Ny anteckning
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ny anteckning</DialogTitle>
          <DialogDescription>Lägg till en anteckning för detta fordon</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200/60">{error}</p>
          )}
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={tag} onValueChange={(v) => setTag(v as "general" | "issue" | "maintenance")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Allmänt</SelectItem>
                <SelectItem value="issue">Problem</SelectItem>
                <SelectItem value="maintenance">Underhåll</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Anteckning</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Skriv din anteckning..."
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !content.trim()}>
            {loading ? "Sparar..." : "Spara anteckning"}
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
            <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200/60">{error}</p>
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
                  className="h-4 w-4 rounded-md border-gray-300 text-gray-900 focus:ring-gray-900/10"
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
