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
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        username: username || undefined,
        email: email || undefined,
        password,
        phone: phone || undefined,
        role,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      const fieldErrors = data.details?.fieldErrors
        ? Object.entries(data.details.fieldErrors)
            .map(([f, msgs]) => `${f}: ${(msgs as string[]).join(", ")}`)
            .join("; ")
        : data.details?.formErrors?.join("; ");
      setError(fieldErrors || data.error || "Något gick fel");
      setLoading(false);
      return;
    }

    setDialogOpen(false);
    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setPhone("");
    setRole("driver");
    setLoading(false);
    router.refresh();
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Förare</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Hantera förarkonton ({drivers.length} förare)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" suppressHydrationWarning>
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
                <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200/60">{error}</p>
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
              {/* Username — required for drivers */}
              {role === "driver" && (
                <div className="space-y-2">
                  <Label>Användarnamn *</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={role === "driver"}
                    placeholder="anna.andersson"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-gray-400">
                    Används för inloggning. Endast bokstäver, siffror, _, ., -
                  </p>
                </div>
              )}

              {/* Email — required for admins, optional for drivers */}
              <div className="space-y-2">
                <Label>E-post {role === "admin" ? "*" : "(valfritt)"}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={role === "admin"}
                  placeholder="anna@example.se"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label>Lösenord *</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Minst 6 tecken"
                  autoComplete="new-password"
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
                      <TableHead>Användarnamn / E-post</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Roll</TableHead>
                      <TableHead>Fordon</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow
                        key={driver.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/drivers/${driver.id}`)}
                      >
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell className="text-gray-500">{driver.username ?? driver.email ?? "—"}</TableCell>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-100">
                {drivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                    onClick={() => router.push(`/drivers/${driver.id}`)}
                  >
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
                    <p className="text-sm text-gray-500 mt-1">{driver.username ?? driver.email ?? "—"}</p>
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
