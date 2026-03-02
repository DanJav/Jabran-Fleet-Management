"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { Driver } from "@/db/schema";

interface CurrentAssignment {
  id: string;
  isPrimary: boolean;
  assignedAt: Date;
  vehicleId: string;
  registrationNumber: string;
  make: string | null;
  model: string | null;
}

interface PastAssignment extends CurrentAssignment {
  unassignedAt: Date | null;
}

interface ActivityEntry {
  id: string;
  action: string;
  createdAt: Date;
  performedByName: string | null;
}

interface DriverReceiptRow {
  id: string;
  category: string;
  amount: string | null;
  notes: string | null;
  fileName: string;
  status: string;
  adminNote: string | null;
  submittedAt: Date;
  registrationNumber: string | null;
}

interface DriverDetailProps {
  driver: Driver;
  currentAssignments: CurrentAssignment[];
  pastAssignments: PastAssignment[];
  activityEntries: ActivityEntry[];
  driverReceipts: DriverReceiptRow[];
}

const RECEIPT_CATEGORY_LABELS: Record<string, string> = {
  fuel: "Bränsle",
  parking: "Parkering",
  tolls: "Trängselskatt",
  repairs: "Reparationer",
  service: "Service",
  other: "Övrigt",
};
const RECEIPT_STATUS_COLORS: Record<string, "default" | "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};
const RECEIPT_STATUS_LABELS: Record<string, string> = {
  pending: "Väntar",
  approved: "Godkänd",
  rejected: "Nekad",
};

type Tab = "overview" | "vehicles" | "activity" | "receipts";

export function DriverDetail({
  driver,
  currentAssignments,
  pastAssignments,
  activityEntries,
  driverReceipts,
}: DriverDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Edit form state
  const [name, setName] = useState(driver.name);
  const [email, setEmail] = useState(driver.email ?? "");
  const [phone, setPhone] = useState(driver.phone ?? "");
  const [role, setRole] = useState<"admin" | "driver">(driver.role);
  const [isActive, setIsActive] = useState(driver.isActive);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDriver, setDeletingDriver] = useState(false);

  const handleDelete = async () => {
    setDeletingDriver(true);
    const res = await fetch(`/api/drivers/${driver.id}`, { method: "DELETE" });
    setDeletingDriver(false);
    if (res.ok) router.push("/drivers");
  };

  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const clearSuccess = () => setSaveSuccess(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError("");
    setPasswordSuccess(false);

    const res = await fetch(`/api/drivers/${driver.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });

    setPasswordSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setPasswordError(data.error || "Något gick fel");
      return;
    }

    setNewPassword("");
    setPasswordSuccess(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    const res = await fetch(`/api/drivers/${driver.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone: phone || null,
        role,
        isActive,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setSaveError(data.error || "Något gick fel");
      return;
    }

    setSaveSuccess(true);
    router.refresh();
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Översikt" },
    { id: "vehicles", label: `Fordon (${currentAssignments.length})` },
    { id: "activity", label: "Aktivitetslogg" },
    {
      id: "receipts",
      label: `Kvitton${driverReceipts.length > 0 ? ` (${driverReceipts.length})` : ""}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/drivers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
              {driver.name}
            </h1>
            <p className="text-[13px] text-gray-500">{driver.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={driver.isActive ? "success" : "default"}>
            {driver.isActive ? "Aktiv" : "Inaktiv"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Förarinformation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4 max-w-md">
              {saveError && (
                <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200/60">
                  {saveError}
                </p>
              )}
              {saveSuccess && (
                <p className="text-[13px] text-green-700 bg-green-50 rounded-lg px-3 py-2 ring-1 ring-green-200/60">
                  Sparat
                </p>
              )}
              <div className="space-y-2">
                <Label>Namn</Label>
                <Input
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearSuccess(); }}
                  required
                />
              </div>
              {driver.username && (
                <div className="space-y-2">
                  <Label>Användarnamn</Label>
                  <Input value={driver.username} readOnly className="bg-gray-50 text-gray-500" />
                </div>
              )}
              <div className="space-y-2">
                <Label>E-post</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearSuccess(); }}
                  required={role === "admin"}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); clearSuccess(); }}
                  placeholder="070-123 45 67"
                />
              </div>
              <div className="space-y-2">
                <Label>Roll</Label>
                <Select value={role} onValueChange={(v) => { setRole(v as "admin" | "driver"); clearSuccess(); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driver">Förare</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={isActive ? "active" : "inactive"}
                  onValueChange={(v) => { setIsActive(v === "active"); clearSuccess(); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Sparar..." : "Spara ändringar"}
              </Button>
            </form>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Byt lösenord</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="space-y-4 max-w-md">
            {passwordError && (
              <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200/60">
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p className="text-[13px] text-green-700 bg-green-50 rounded-lg px-3 py-2 ring-1 ring-green-200/60">
                Lösenordet har uppdaterats
              </p>
            )}
            <div className="space-y-2">
              <Label>Nytt lösenord</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordSuccess(false); }}
                required
                placeholder="Minst 6 tecken"
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" variant="outline" disabled={passwordSaving}>
              {passwordSaving ? "Sparar..." : "Uppdatera lösenord"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
      )}

      {/* Vehicles Tab */}
      {activeTab === "vehicles" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tilldelade fordon</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {currentAssignments.length === 0 ? (
                <p className="text-[13px] text-gray-500 p-4">Inga fordon tilldelade</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registreringsnummer</TableHead>
                      <TableHead>Fordon</TableHead>
                      <TableHead>Primär</TableHead>
                      <TableHead>Tilldelad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentAssignments.map((a) => (
                      <TableRow
                        key={a.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/vehicles/${a.vehicleId}`)}
                      >
                        <TableCell className="font-medium">{a.registrationNumber}</TableCell>
                        <TableCell className="text-gray-500">{a.make} {a.model}</TableCell>
                        <TableCell>
                          {a.isPrimary ? (
                            <Badge variant="accent">Primär</Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-500">{formatDate(a.assignedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {pastAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Tidigare fordon</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registreringsnummer</TableHead>
                      <TableHead>Fordon</TableHead>
                      <TableHead>Tilldelad</TableHead>
                      <TableHead>Avslutad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastAssignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-gray-500">{a.registrationNumber}</TableCell>
                        <TableCell className="text-gray-400">{a.make} {a.model}</TableCell>
                        <TableCell className="text-gray-400">{formatDate(a.assignedAt)}</TableCell>
                        <TableCell className="text-gray-400">
                          {a.unassignedAt ? formatDate(a.unassignedAt) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Aktivitetslogg</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activityEntries.length === 0 ? (
              <p className="text-[13px] text-gray-500 p-4">Ingen aktivitet registrerad</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Åtgärd</TableHead>
                    <TableHead>Utförd av</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-gray-500 text-[13px]">
                        {formatDate(entry.createdAt)}
                      </TableCell>
                      <TableCell className="capitalize">{entry.action}</TableCell>
                      <TableCell className="text-gray-500">
                        {entry.performedByName ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Receipts Tab */}
      {activeTab === "receipts" && (
        <div className="space-y-3">
          {driverReceipts.length === 0 ? (
            <p className="text-[13px] text-gray-500 py-4">Inga kvitton inlämnade.</p>
          ) : (
            driverReceipts.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {RECEIPT_CATEGORY_LABELS[r.category] ?? r.category}
                    </span>
                    {r.registrationNumber && (
                      <span className="text-xs text-gray-400">
                        · {r.registrationNumber}
                      </span>
                    )}
                    {r.amount && (
                      <span className="text-xs text-gray-400">· {r.amount} SEK</span>
                    )}
                  </div>
                  {r.notes && (
                    <p className="text-xs text-gray-500">{r.notes}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {formatDate(r.submittedAt)} · {r.fileName}
                  </p>
                </div>
                <Badge variant={RECEIPT_STATUS_COLORS[r.status] ?? "secondary"}>
                  {RECEIPT_STATUS_LABELS[r.status] ?? r.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      )}
      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Radera förare</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill radera <strong>{driver.name}</strong>? Detta går inte att ångra och kontot tas bort permanent.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletingDriver}>
              {deletingDriver ? "Raderar..." : "Radera förare"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
