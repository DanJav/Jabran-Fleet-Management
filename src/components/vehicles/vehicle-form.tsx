"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Vehicle } from "@/db/schema";

interface VehicleFormProps {
  vehicle?: Vehicle;
}

export function VehicleForm({ vehicle }: VehicleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    registrationNumber: vehicle?.registrationNumber ?? "",
    vin: vehicle?.vin ?? "",
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    modelYear: vehicle?.modelYear?.toString() ?? "",
    color: vehicle?.color ?? "",
    fuelType: vehicle?.fuelType ?? "",
    hasTaxameter: vehicle?.hasTaxameter ?? true,
    equipmentType: vehicle?.equipmentType ?? "taxameter",
    taxameterMake: vehicle?.taxameterMake ?? "",
    taxameterType: vehicle?.taxameterType ?? "",
    taxameterSerial: vehicle?.taxameterSerial ?? "",
    redovisningscentral: vehicle?.redovisningscentral ?? "",
    currentMileage: vehicle?.currentMileage?.toString() ?? "0",
    notes: vehicle?.notes ?? "",
  });

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      registrationNumber: form.registrationNumber.toUpperCase().trim(),
      vin: form.vin || undefined,
      make: form.make || undefined,
      model: form.model || undefined,
      modelYear: form.modelYear ? parseInt(form.modelYear) : undefined,
      color: form.color || undefined,
      fuelType: form.fuelType || undefined,
      hasTaxameter: form.hasTaxameter,
      equipmentType: form.equipmentType as "taxameter" | "suft" | "none",
      taxameterMake: form.taxameterMake || undefined,
      taxameterType: form.taxameterType || undefined,
      taxameterSerial: form.taxameterSerial || undefined,
      redovisningscentral: form.redovisningscentral || undefined,
      currentMileage: parseInt(form.currentMileage) || 0,
      notes: form.notes || undefined,
    };

    try {
      const url = vehicle ? `/api/vehicles/${vehicle.id}` : "/api/vehicles";
      const method = vehicle ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Något gick fel");
        setLoading(false);
        return;
      }

      router.push("/vehicles");
      router.refresh();
    } catch {
      setError("Nätverksfel. Försök igen.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200/60 px-4 py-3 text-[13px] text-red-700 ring-1 ring-red-200/40">
          {error}
        </div>
      )}

      {/* Vehicle info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fordonsinformation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regNr">Registreringsnummer *</Label>
              <Input
                id="regNr"
                value={form.registrationNumber}
                onChange={(e) => updateField("registrationNumber", e.target.value)}
                placeholder="ABC123"
                required
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vin">VIN / Chassinr</Label>
              <Input
                id="vin"
                value={form.vin}
                onChange={(e) => updateField("vin", e.target.value)}
                placeholder="YV1..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">Fabrikat</Label>
              <Input
                id="make"
                value={form.make}
                onChange={(e) => updateField("make", e.target.value)}
                placeholder="Volvo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modell</Label>
              <Input
                id="model"
                value={form.model}
                onChange={(e) => updateField("model", e.target.value)}
                placeholder="V60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Årsmodell</Label>
              <Input
                id="year"
                type="number"
                value={form.modelYear}
                onChange={(e) => updateField("modelYear", e.target.value)}
                placeholder="2023"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Färg</Label>
              <Input
                id="color"
                value={form.color}
                onChange={(e) => updateField("color", e.target.value)}
                placeholder="Svart"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel">Bränsle</Label>
              <Input
                id="fuel"
                value={form.fuelType}
                onChange={(e) => updateField("fuelType", e.target.value)}
                placeholder="Diesel"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mileage">Mätarställning (km)</Label>
            <Input
              id="mileage"
              type="number"
              value={form.currentMileage}
              onChange={(e) => updateField("currentMileage", e.target.value)}
              min="0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Taxameter info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Taxameter / SUFT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Utrustningstyp</Label>
            <Select
              value={form.equipmentType}
              onValueChange={(value) => updateField("equipmentType", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="taxameter">Taxameter</SelectItem>
                <SelectItem value="suft">SUFT</SelectItem>
                <SelectItem value="none">Ingen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.equipmentType !== "none" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxMake">Fabrikat</Label>
                  <Input
                    id="taxMake"
                    value={form.taxameterMake}
                    onChange={(e) => updateField("taxameterMake", e.target.value)}
                    placeholder="MegTax"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxType">Typ</Label>
                  <Input
                    id="taxType"
                    value={form.taxameterType}
                    onChange={(e) => updateField("taxameterType", e.target.value)}
                    placeholder="MT310"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxSerial">Serienummer</Label>
                  <Input
                    id="taxSerial"
                    value={form.taxameterSerial}
                    onChange={(e) => updateField("taxameterSerial", e.target.value)}
                    placeholder="XO006492"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="redovisning">Redovisningscentral</Label>
                  <Input
                    id="redovisning"
                    value={form.redovisningscentral}
                    onChange={(e) => updateField("redovisningscentral", e.target.value)}
                    placeholder="STRUCTAB AB"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Anteckningar</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            className="flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-gray-400 hover:border-gray-300 focus-visible:outline-none focus-visible:border-gray-400 focus-visible:ring-2 focus-visible:ring-gray-900/5 transition-all duration-150"
            placeholder="Valfria anteckningar..."
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Sparar..."
            : vehicle
            ? "Uppdatera fordon"
            : "Lägg till fordon"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}
