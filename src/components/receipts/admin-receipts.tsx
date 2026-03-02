"use client";

import { useState, useEffect } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ReceiptRow {
  id: string;
  category: string;
  amount: string | null;
  notes: string | null;
  fileName: string;
  fileUrl: string;
  status: string;
  adminNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  driverName: string | null;
  registrationNumber: string | null;
  driverId: string;
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

export function AdminReceipts() {
  const [receiptList, setReceiptList] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<ReceiptRow | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetch("/api/receipts")
      .then((r) => r.json())
      .then((data) => {
        setReceiptList(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openReceipt = async (r: ReceiptRow) => {
    setSelected(r);
    setAdminNote(r.adminNote ?? "");
    setSignedUrl(null);
    const res = await fetch(`/api/receipts/${r.id}`);
    if (res.ok) {
      const data = await res.json();
      setSignedUrl(data.signedUrl);
    }
  };

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selected) return;
    setReviewing(true);
    const res = await fetch(`/api/receipts/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote: adminNote || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setReceiptList((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
      setSelected(null);
    }
    setReviewing(false);
  };

  const filtered = receiptList.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (search && !r.driverName?.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Kvitton</h1>
        <p className="text-sm text-gray-500 mt-1">
          Granska och hantera inlämnade kvitton
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Sök förare..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla status</SelectItem>
            <SelectItem value="pending">Väntar</SelectItem>
            <SelectItem value="approved">Godkänd</SelectItem>
            <SelectItem value="rejected">Nekad</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla kategorier</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Laddar...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Inga kvitton hittades</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Förare</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Fordon</TableHead>
                <TableHead>Belopp</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => openReceipt(r)}
                >
                  <TableCell className="font-medium">
                    {r.driverName ?? "–"}
                  </TableCell>
                  <TableCell>
                    {CATEGORY_LABELS[r.category] ?? r.category}
                  </TableCell>
                  <TableCell>{r.registrationNumber ?? "–"}</TableCell>
                  <TableCell>
                    {r.amount ? `${r.amount} SEK` : "–"}
                  </TableCell>
                  <TableCell>{formatDate(r.submittedAt)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[r.status] ?? "secondary"}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Kvitto –{" "}
              {selected ? CATEGORY_LABELS[selected.category] ?? selected.category : ""}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-5">
              {signedUrl ? (
                selected.fileName.toLowerCase().endsWith(".pdf") ? (
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 underline"
                  >
                    Öppna PDF: {selected.fileName}
                  </a>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signedUrl}
                    alt="Kvitto"
                    className="rounded-lg border border-gray-200 max-h-72 object-contain w-full"
                  />
                )
              ) : (
                <div className="h-32 rounded-lg bg-gray-100 animate-pulse" />
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Förare</span>
                  <span className="font-medium">{selected.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fordon</span>
                  <span>{selected.registrationNumber ?? "–"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Belopp</span>
                  <span>
                    {selected.amount ? `${selected.amount} SEK` : "–"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Inlämnad</span>
                  <span>{formatDate(selected.submittedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <Badge variant={STATUS_COLORS[selected.status] ?? "secondary"}>
                    {STATUS_LABELS[selected.status] ?? selected.status}
                  </Badge>
                </div>
              </div>

              {selected.notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Förarens anteckning
                  </p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                    {selected.notes}
                  </p>
                </div>
              )}

              {selected.status === "pending" && (
                <div className="space-y-2">
                  <Label htmlFor="adminNote">
                    Anteckning (valfritt, visas vid nekad)
                  </Label>
                  <Textarea
                    id="adminNote"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Ange anledning om du nekar..."
                    rows={3}
                  />
                </div>
              )}

              {selected.status !== "pending" && selected.adminNote && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Admin-anteckning
                  </p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                    {selected.adminNote}
                  </p>
                </div>
              )}

              {selected.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleReview("approved")}
                    disabled={reviewing}
                  >
                    Godkänn
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReview("rejected")}
                    disabled={reviewing}
                  >
                    Neka
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
