"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
import { formatDate } from "@/lib/utils";
import type { Driver } from "@/db/schema";

interface CurrentAssignment {
  id: string;
  isPrimary: boolean;
  assignedAt: Date;
  vehicleId: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface PastAssignment extends CurrentAssignment {
  unassignedAt: Date | null;
}

interface ActivityEntry {
  id: string;
  action: string;
  changes: unknown;
  createdAt: Date;
  performedByName: string | null;
}

interface DriverDetailProps {
  driver: Driver;
  currentAssignments: CurrentAssignment[];
  pastAssignments: PastAssignment[];
  activityEntries: ActivityEntry[];
}

type Tab = "overview" | "vehicles" | "activity";

export function DriverDetail({
  driver,
  currentAssignments,
  pastAssignments,
  activityEntries,
}: DriverDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Edit form state
  const [name, setName] = useState(driver.name);
  const [email, setEmail] = useState(driver.email);
  const [phone, setPhone] = useState(driver.phone ?? "");
  const [role, setRole] = useState<"admin" | "driver">(driver.role);
  const [isActive, setIsActive] = useState(driver.isActive);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

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
        <Badge variant={driver.isActive ? "success" : "default"}>
          {driver.isActive ? "Aktiv" : "Inaktiv"}
        </Badge>
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
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>E-post</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="070-123 45 67"
                />
              </div>
              <div className="space-y-2">
                <Label>Roll</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "admin" | "driver")}>
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
                  onValueChange={(v) => setIsActive(v === "active")}
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
    </div>
  );
}
