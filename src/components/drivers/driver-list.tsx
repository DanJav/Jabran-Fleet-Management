"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { EmptyState } from "@/components/ui/empty-state";
import type { Driver } from "@/db/schema";

type DriverWithVehicles = Driver & {
  assignedVehicles: { registrationNumber: string; isPrimary: boolean }[];
};

export function DriverList({ drivers }: { drivers: DriverWithVehicles[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "driver">("driver");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone: phone || undefined,
        role,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Något gick fel");
      setLoading(false);
      return;
    }

    setDialogOpen(false);
    setName("");
    setEmail("");
    setPhone("");
    setRole("driver");
    setLoading(false);
    router.refresh();
  };

  const toggleActive = async (driverId: string, isActive: boolean) => {
    await fetch(`/api/drivers/${driverId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Förare</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hantera förarkonton ({drivers.length} förare)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Lägg till
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lägg till förare</DialogTitle>
              <DialogDescription>Skapa ett nytt förarkonto</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
              )}
              <div className="space-y-2">
                <Label>Namn *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Anna Andersson"
                />
              </div>
              <div className="space-y-2">
                <Label>E-post *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="anna@example.se"
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sparar..." : "Skapa förare"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {drivers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Inga förare"
              description="Lägg till din första förare för att komma igång."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Namn</TableHead>
                      <TableHead>E-post</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Roll</TableHead>
                      <TableHead>Fordon</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell className="text-gray-500">{driver.email}</TableCell>
                        <TableCell className="text-gray-500">{driver.phone || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={driver.role === "admin" ? "accent" : "default"}>
                            {driver.role === "admin" ? "Admin" : "Förare"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {driver.assignedVehicles.length > 0
                            ? driver.assignedVehicles
                                .map((v) => v.registrationNumber)
                                .join(", ")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={driver.isActive ? "success" : "default"}>
                            {driver.isActive ? "Aktiv" : "Inaktiv"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(driver.id, driver.isActive)}
                          >
                            {driver.isActive ? "Inaktivera" : "Aktivera"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-100">
                {drivers.map((driver) => (
                  <div key={driver.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{driver.name}</span>
                      <div className="flex gap-1">
                        <Badge variant={driver.role === "admin" ? "accent" : "default"}>
                          {driver.role === "admin" ? "Admin" : "Förare"}
                        </Badge>
                        <Badge variant={driver.isActive ? "success" : "default"}>
                          {driver.isActive ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{driver.email}</p>
                    {driver.assignedVehicles.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Fordon: {driver.assignedVehicles.map((v) => v.registrationNumber).join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
