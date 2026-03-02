"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { Plus, Receipt } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AssignedVehicle {
  id: string;
  registrationNumber: string;
  make: string | null;
  model: string | null;
}

interface ReceiptRow {
  id: string;
  category: string;
  amount: string | null;
  notes: string | null;
  fileName: string;
  status: string;
  adminNote: string | null;
  submittedAt: string;
  registrationNumber: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  fuel: "Bränsle",
  parking: "Parkering",
  tolls: "Trängselskatt",
  repairs: "Reparationer",
  service: "Service",
  other: "Övrigt",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Väntar",
  approved: "Godkänd",
  rejected: "Nekad",
};

export function DriverReceipts({
  assignedVehicles,
}: {
  assignedVehicles: AssignedVehicle[];
}) {
  const [receiptList, setReceiptList] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState("");
  const [vehicleId, setVehicleId] = useState("none");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/receipts")
      .then((r) => r.json())
      .then((data) => {
        setReceiptList(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setCategory("");
    setVehicleId("none");
    setAmount("");
    setNotes("");
    setFile(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !category) {
      setError("Välj kategori och bifoga en fil.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch("/api/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        vehicleId: vehicleId === "none" ? null : vehicleId,
        amount: amount || null,
        notes: notes || null,
        fileName: file.name,
        fileBase64: base64,
        fileType: file.type,
      }),
    });

    if (res.ok) {
      const newReceipt = await res.json();
      setReceiptList((prev) => [newReceipt, ...prev]);
      setOpen(false);
      resetForm();
    } else {
      setError("Något gick fel. Försök igen.");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Kvitton</h1>
          <p className="text-sm text-gray-500 mt-1">Ladda upp kvitton för utlägg</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ladda upp kvitto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ladda upp kvitto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="category">Kategori *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Välj kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle">Fordon</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger id="vehicle">
                    <SelectValue placeholder="Välj fordon (valfritt)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ej kopplat till fordon</SelectItem>
                    {assignedVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.registrationNumber}
                        {v.make ? ` – ${v.make}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Belopp (SEK)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Anteckningar</Label>
                <Textarea
                  id="notes"
                  placeholder="Beskriv utlägget..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">Fil (bild eller PDF) *</Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*,.pdf"
                  ref={fileRef}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  Avbryt
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Laddar upp..." : "Skicka in"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Laddar...</p>
      ) : receiptList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Inga kvitton uppladdade än</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {receiptList.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {CATEGORY_LABELS[r.category] ?? r.category}
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
                  {r.notes && <p className="text-xs text-gray-500">{r.notes}</p>}
                  {r.adminNote && r.status === "rejected" && (
                    <p className="text-xs text-red-500">Anledning: {r.adminNote}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {formatDate(r.submittedAt)} · {r.fileName}
                  </p>
                </div>
                <Badge variant={STATUS_COLORS[r.status] ?? "secondary"}>
                  {STATUS_LABELS[r.status] ?? r.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
