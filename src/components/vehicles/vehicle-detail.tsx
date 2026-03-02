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
  Pencil,
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
  changeLog: {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    changes: unknown;
    createdAt: Date;
    performedByName: string | null;
  }[];
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
  changeLog,
}: VehicleDetailProps) {
  const router = useRouter();
  const [togglingActive, setTogglingActive] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVehicleEdit, setShowVehicleEdit] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    registrationNumber: vehicle.registrationNumber ?? "",
    vin: vehicle.vin ?? "",
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    modelYear: vehicle.modelYear?.toString() ?? "",
    color: vehicle.color ?? "",
    fuelType: vehicle.fuelType ?? "",
  });
  const [savingVehicle, setSavingVehicle] = useState(false);

  const handleSaveVehicle = async () => {
    setSavingVehicle(true);
    await fetch(`/api/vehicles/${vehicle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        registrationNumber: vehicleForm.registrationNumber || undefined,
        vin: vehicleForm.vin || null,
        make: vehicleForm.make || null,
        model: vehicleForm.model || null,
        modelYear: vehicleForm.modelYear ? parseInt(vehicleForm.modelYear) : null,
        color: vehicleForm.color || null,
        fuelType: vehicleForm.fuelType || null,
      }),
    });
    setSavingVehicle(false);
    setShowVehicleEdit(false);
    router.refresh();
  };

  const [showTaxameterEdit, setShowTaxameterEdit] = useState(false);
  const [taxameterForm, setTaxameterForm] = useState({
    equipmentType: vehicle.equipmentType ?? "none",
    taxameterMake: vehicle.taxameterMake ?? "",
    taxameterType: vehicle.taxameterType ?? "",
    taxameterSerial: vehicle.taxameterSerial ?? "",
    redovisningscentral: vehicle.redovisningscentral ?? "",
  });
  const [savingTaxameter, setSavingTaxameter] = useState(false);

  const handleSaveTaxameter = async () => {
    setSavingTaxameter(true);
    await fetch(`/api/vehicles/${vehicle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipmentType: taxameterForm.equipmentType,
        taxameterMake: taxameterForm.taxameterMake || null,
        taxameterType: taxameterForm.taxameterType || null,
        taxameterSerial: taxameterForm.taxameterSerial || null,
        redovisningscentral: taxameterForm.redovisningscentral || null,
      }),
    });
    setSavingTaxameter(false);
    setShowTaxameterEdit(false);
    router.refresh();
  };

  // Edit/delete state for history records
  const [editingService, setEditingService] = useState<ServiceEvent | null>(null);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [editingMileage, setEditingMileage] = useState<MileageLog | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<{ type: "service" | "inspection" | "mileage"; id: string; label: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [svcForm, setSvcForm] = useState({ serviceType: "A" as "A" | "B", date: "", mileageAtService: "", performedBy: "", costSek: "", notes: "" });
  const [insForm, setInsForm] = useState({ inspectionType: "besiktning" as "besiktning" | "taxameter" | "suft", date: "", result: "" as "" | "approved" | "approved_with_notes" | "failed", performedBy: "", notes: "", avvikelse: "" });
  const [mlgForm, setMlgForm] = useState({ mileage: "", notes: "" });

  const openEditService = (s: ServiceEvent) => {
    setSvcForm({ serviceType: s.serviceType, date: s.date, mileageAtService: s.mileageAtService.toString(), performedBy: s.performedBy ?? "", costSek: s.costSek ?? "", notes: s.notes ?? "" });
    setEditingService(s);
  };
  const handleSaveService = async () => {
    if (!editingService) return;
    setSavingEdit(true);
    await fetch(`/api/vehicles/${vehicle.id}/services/${editingService.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceType: svcForm.serviceType, date: svcForm.date, mileageAtService: parseInt(svcForm.mileageAtService), performedBy: svcForm.performedBy || undefined, costSek: svcForm.costSek ? parseFloat(svcForm.costSek) : undefined, notes: svcForm.notes || undefined }),
    });
    setSavingEdit(false);
    setEditingService(null);
    router.refresh();
  };

  const openEditInspection = (i: Inspection) => {
    setInsForm({ inspectionType: i.inspectionType, date: i.date, result: (i.result ?? "") as typeof insForm.result, performedBy: i.performedBy ?? "", notes: i.notes ?? "", avvikelse: i.avvikelse ?? "" });
    setEditingInspection(i);
  };
  const handleSaveInspection = async () => {
    if (!editingInspection) return;
    setSavingEdit(true);
    await fetch(`/api/vehicles/${vehicle.id}/inspections/${editingInspection.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionType: insForm.inspectionType, date: insForm.date, result: insForm.result || undefined, performedBy: insForm.performedBy || undefined, notes: insForm.notes || undefined, avvikelse: insForm.avvikelse || undefined }),
    });
    setSavingEdit(false);
    setEditingInspection(null);
    router.refresh();
  };

  const openEditMileage = (m: MileageLog) => {
    setMlgForm({ mileage: m.mileage.toString(), notes: m.notes ?? "" });
    setEditingMileage(m);
  };
  const handleSaveMileage = async () => {
    if (!editingMileage) return;
    setSavingEdit(true);
    await fetch(`/api/vehicles/${vehicle.id}/mileage/${editingMileage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mileage: parseInt(mlgForm.mileage), notes: mlgForm.notes || undefined }),
    });
    setSavingEdit(false);
    setEditingMileage(null);
    router.refresh();
  };

  const handleDeleteRecord = async () => {
    if (!deletingRecord) return;
    setConfirmingDelete(true);
    const urlMap = {
      service: `/api/vehicles/${vehicle.id}/services/${deletingRecord.id}`,
      inspection: `/api/vehicles/${vehicle.id}/inspections/${deletingRecord.id}`,
      mileage: `/api/vehicles/${vehicle.id}/mileage/${deletingRecord.id}`,
    };
    await fetch(urlMap[deletingRecord.type], { method: "DELETE" });
    setConfirmingDelete(false);
    setDeletingRecord(null);
    router.refresh();
  };

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
        <LogServiceDialog vehicleId={vehicle.id} currentMileage={vehicle.currentMileage} />
        <LogInspectionDialog vehicleId={vehicle.id} />
        {isAdmin && (
          <AssignDriverDialog
            vehicleId={vehicle.id}
            allDrivers={allDrivers}
            currentAssignments={assignments}
          />
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
              type: "service" | "inspection" | "mileage" | "note" | "change";
              date: Date;
              title: string;
              detail: string;
            };

            const entityTypeLabels: Record<string, string> = {
              service_event: "Service",
              inspection: "Besiktning",
              mileage_log: "Mätaravläsning",
            };

            function formatChangeDetail(entry: typeof changeLog[number]): string {
              const c = entry.changes as Record<string, unknown>;
              if (entry.action === "deleted") {
                if (entry.entityType === "service_event") return `Service ${c.serviceType} – ${c.date}, ${Number(c.mileageAtService).toLocaleString("sv-SE")} km`;
                if (entry.entityType === "inspection") return `${c.inspectionType} – ${c.date}`;
                if (entry.entityType === "mileage_log") return `${Number(c.mileage).toLocaleString("sv-SE")} km`;
                return "";
              }
              // action === "updated"
              const oldData = (c.old ?? {}) as Record<string, unknown>;
              const newData = (c.new ?? {}) as Record<string, unknown>;
              const parts: string[] = [];
              for (const key of Object.keys(newData)) {
                const ov = oldData[key];
                const nv = newData[key];
                if (ov !== undefined && ov !== nv) {
                  const label = key === "mileageAtService" || key === "mileage" ? "km" : key === "costSek" ? "kr" : key;
                  const fmtOld = typeof ov === "number" ? ov.toLocaleString("sv-SE") : String(ov ?? "—");
                  const fmtNew = typeof nv === "number" ? nv.toLocaleString("sv-SE") : String(nv ?? "—");
                  parts.push(`${label}: ${fmtOld} → ${fmtNew}`);
                }
              }
              return parts.length > 0 ? parts.join(", ") : "Uppdaterad";
            }

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
              ...changeLog.map((entry) => ({
                id: `change-${entry.id}`,
                type: "change" as const,
                date: new Date(entry.createdAt),
                title: `${entry.action === "deleted" ? "Raderad" : "Ändrad"}: ${entityTypeLabels[entry.entityType] ?? entry.entityType}`,
                detail: `${formatChangeDetail(entry)}${entry.performedByName ? ` · ${entry.performedByName}` : ""}`,
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
              change: "bg-orange-100 text-orange-700",
            };

            const typeLabels: Record<string, string> = {
              service: "Service",
              inspection: "Besikt.",
              mileage: "Mätare",
              note: "Notering",
              change: "Ändring",
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Fordonsinformation</CardTitle>
            {isAdmin && (
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setShowVehicleEdit(true)}>
                Redigera
              </Button>
            )}
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

        <Dialog open={showVehicleEdit} onOpenChange={setShowVehicleEdit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redigera fordonsinformation</DialogTitle>
              <DialogDescription>Uppdatera grundläggande information om fordonet</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reg.nr</Label>
                  <Input
                    value={vehicleForm.registrationNumber}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, registrationNumber: e.target.value }))}
                    placeholder="ABC123"
                  />
                </div>
                <div className="space-y-2">
                  <Label>VIN</Label>
                  <Input
                    value={vehicleForm.vin}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, vin: e.target.value }))}
                    placeholder="Chassinummer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fabrikat</Label>
                  <Input
                    value={vehicleForm.make}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, make: e.target.value }))}
                    placeholder="t.ex. Volvo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modell</Label>
                  <Input
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))}
                    placeholder="t.ex. V60"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Årsmodell</Label>
                  <Input
                    type="number"
                    value={vehicleForm.modelYear}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, modelYear: e.target.value }))}
                    placeholder="2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Färg</Label>
                  <Input
                    value={vehicleForm.color}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, color: e.target.value }))}
                    placeholder="t.ex. Svart"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bränsle</Label>
                  <Input
                    value={vehicleForm.fuelType}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, fuelType: e.target.value }))}
                    placeholder="t.ex. Bensin"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowVehicleEdit(false)}>Avbryt</Button>
              <Button onClick={handleSaveVehicle} disabled={savingVehicle}>
                {savingVehicle ? "Sparar…" : "Spara"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Taxameter / SUFT</CardTitle>
            {isAdmin && (
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setShowTaxameterEdit(true)}>
                Redigera
              </Button>
            )}
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

        <Dialog open={showTaxameterEdit} onOpenChange={setShowTaxameterEdit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redigera Taxameter / SUFT</DialogTitle>
              <DialogDescription>Uppdatera utrustningsinformation för fordonet</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Utrustning</Label>
                <Select
                  value={taxameterForm.equipmentType}
                  onValueChange={(v) => setTaxameterForm((f) => ({ ...f, equipmentType: v as "none" | "taxameter" | "suft" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen</SelectItem>
                    <SelectItem value="taxameter">Taxameter</SelectItem>
                    <SelectItem value="suft">SUFT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fabrikat</Label>
                <Input
                  value={taxameterForm.taxameterMake}
                  onChange={(e) => setTaxameterForm((f) => ({ ...f, taxameterMake: e.target.value }))}
                  placeholder="t.ex. Hale"
                />
              </div>
              <div className="space-y-2">
                <Label>Typ</Label>
                <Input
                  value={taxameterForm.taxameterType}
                  onChange={(e) => setTaxameterForm((f) => ({ ...f, taxameterType: e.target.value }))}
                  placeholder="Modellbeteckning"
                />
              </div>
              <div className="space-y-2">
                <Label>Serienr</Label>
                <Input
                  value={taxameterForm.taxameterSerial}
                  onChange={(e) => setTaxameterForm((f) => ({ ...f, taxameterSerial: e.target.value }))}
                  placeholder="Serienummer"
                />
              </div>
              <div className="space-y-2">
                <Label>Redovisningscentral</Label>
                <Input
                  value={taxameterForm.redovisningscentral}
                  onChange={(e) => setTaxameterForm((f) => ({ ...f, redovisningscentral: e.target.value }))}
                  placeholder="t.ex. Cabonline"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowTaxameterEdit(false)}>Avbryt</Button>
              <Button onClick={handleSaveTaxameter} disabled={savingTaxameter}>
                {savingTaxameter ? "Sparar…" : "Spara"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                  {isAdmin && <TableHead />}
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
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditService(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeletingRecord({ type: "service", id: s.id, label: `Service ${s.serviceType} – ${s.date}` })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
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
                  {isAdmin && <TableHead />}
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
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditInspection(i)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeletingRecord({ type: "inspection", id: i.id, label: `${i.inspectionType === "besiktning" ? "Besiktning" : i.inspectionType === "taxameter" ? "Taxameter" : "SUFT"} – ${i.date}` })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
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
                  {isAdmin && <TableHead />}
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
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMileage(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeletingRecord({ type: "mileage", id: m.id, label: `${m.mileage.toLocaleString("sv-SE")} km – ${formatDate(m.loggedAt)}` })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit service dialog */}
      <Dialog open={!!editingService} onOpenChange={(o) => { if (!o) setEditingService(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redigera service</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Typ</Label>
              <Select value={svcForm.serviceType} onValueChange={(v) => setSvcForm((f) => ({ ...f, serviceType: v as "A" | "B" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Service A</SelectItem>
                  <SelectItem value="B">Service B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Datum</Label>
              <Input type="date" value={svcForm.date} onChange={(e) => setSvcForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Mätarställning (km)</Label>
              <Input type="number" value={svcForm.mileageAtService} onChange={(e) => setSvcForm((f) => ({ ...f, mileageAtService: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Utförd av</Label>
              <Input value={svcForm.performedBy} onChange={(e) => setSvcForm((f) => ({ ...f, performedBy: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Kostnad (SEK)</Label>
              <Input type="number" value={svcForm.costSek} onChange={(e) => setSvcForm((f) => ({ ...f, costSek: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Anteckning</Label>
              <Input value={svcForm.notes} onChange={(e) => setSvcForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditingService(null)}>Avbryt</Button>
              <Button onClick={handleSaveService} disabled={savingEdit}>{savingEdit ? "Sparar..." : "Spara"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit inspection dialog */}
      <Dialog open={!!editingInspection} onOpenChange={(o) => { if (!o) setEditingInspection(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redigera besiktning</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Typ</Label>
              <Select value={insForm.inspectionType} onValueChange={(v) => setInsForm((f) => ({ ...f, inspectionType: v as typeof insForm.inspectionType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="besiktning">Besiktning</SelectItem>
                  <SelectItem value="taxameter">Taxameter</SelectItem>
                  <SelectItem value="suft">SUFT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Datum</Label>
              <Input type="date" value={insForm.date} onChange={(e) => setInsForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Resultat</Label>
              <Select value={insForm.result} onValueChange={(v) => setInsForm((f) => ({ ...f, result: v as typeof insForm.result }))}>
                <SelectTrigger><SelectValue placeholder="Välj resultat" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Godkänd</SelectItem>
                  <SelectItem value="approved_with_notes">Godkänd m. anm.</SelectItem>
                  <SelectItem value="failed">Underkänd</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Utförd av</Label>
              <Input value={insForm.performedBy} onChange={(e) => setInsForm((f) => ({ ...f, performedBy: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Avvikelse</Label>
              <Input value={insForm.avvikelse} onChange={(e) => setInsForm((f) => ({ ...f, avvikelse: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Anteckning</Label>
              <Input value={insForm.notes} onChange={(e) => setInsForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditingInspection(null)}>Avbryt</Button>
              <Button onClick={handleSaveInspection} disabled={savingEdit}>{savingEdit ? "Sparar..." : "Spara"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit mileage dialog */}
      <Dialog open={!!editingMileage} onOpenChange={(o) => { if (!o) setEditingMileage(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redigera mätarställning</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Mätarställning (km)</Label>
              <Input type="number" value={mlgForm.mileage} onChange={(e) => setMlgForm((f) => ({ ...f, mileage: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Anteckning</Label>
              <Input value={mlgForm.notes} onChange={(e) => setMlgForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditingMileage(null)}>Avbryt</Button>
              <Button onClick={handleSaveMileage} disabled={savingEdit}>{savingEdit ? "Sparar..." : "Spara"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete record confirmation dialog */}
      <Dialog open={!!deletingRecord} onOpenChange={(o) => { if (!o) setDeletingRecord(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Radera post</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill radera <strong>{deletingRecord?.label}</strong>? Detta går inte att ångra.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletingRecord(null)}>Avbryt</Button>
            <Button variant="destructive" onClick={handleDeleteRecord} disabled={confirmingDelete}>
              {confirmingDelete ? "Raderar..." : "Radera"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
