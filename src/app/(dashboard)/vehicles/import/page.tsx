"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PreviewRow {
  registrationNumber?: string;
  make?: string;
  model?: string;
  modelYear?: number;
  color?: string;
  fuelType?: string;
  vin?: string;
  currentMileage?: number;
  redovisningscentral?: string;
  taxameterMake?: string;
  taxameterType?: string;
  taxameterSerial?: string;
  inspectionDate?: string;
}

interface ColumnInfo {
  original: string;
  mapped: string | null;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(selectedFile: File) {
    setFile(selectedFile);
    setResult(null);
    setError(null);
    setPreviewRows([]);

    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoading(true);
    try {
      const res = await fetch("/api/import/xlsx?mode=preview", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Kunde inte läsa filen");
        return;
      }

      const data = await res.json();
      setPreviewRows(data.rows);
      setColumns(data.columns);
    } catch {
      setError("Nätverksfel vid uppladdning");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/import/xlsx?mode=confirm", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Import misslyckades");
        return;
      }

      const data: ImportResult = await res.json();
      setResult(data);
      setPreviewRows([]);
    } catch {
      setError("Nätverksfel vid import");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setPreviewRows([]);
    setColumns([]);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Importera fordon
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ladda upp en Excel-fil med fordonsdata
          </p>
        </div>
        <Link href="/vehicles">
          <Button variant="outline" size="sm">
            Tillbaka till fordon
          </Button>
        </Link>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Välj fil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
              className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-900 file:text-white hover:file:bg-gray-700 file:cursor-pointer"
            />
            {file && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Rensa
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Column Mapping Info */}
      {columns.length > 0 && previewRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kolumnmappning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {columns.map((col) => (
                <Badge
                  key={col.original}
                  variant={col.mapped ? "accent" : "default"}
                >
                  {col.original}
                  {col.mapped ? ` -> ${col.mapped}` : " (ignorerad)"}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}
      {previewRows.length > 0 && !result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Förhandsgranskning ({previewRows.length} rader)
            </CardTitle>
            <Button onClick={handleImport} disabled={loading}>
              {loading ? "Importerar..." : "Importera"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reg.nr</TableHead>
                    <TableHead>Fabrikat</TableHead>
                    <TableHead>Modell</TableHead>
                    <TableHead>År</TableHead>
                    <TableHead>Färg</TableHead>
                    <TableHead>Bränsle</TableHead>
                    <TableHead>Mätarställning</TableHead>
                    <TableHead>VIN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono font-medium">
                        {row.registrationNumber || "-"}
                      </TableCell>
                      <TableCell>{row.make || "-"}</TableCell>
                      <TableCell>{row.model || "-"}</TableCell>
                      <TableCell>{row.modelYear || "-"}</TableCell>
                      <TableCell>{row.color || "-"}</TableCell>
                      <TableCell>{row.fuelType || "-"}</TableCell>
                      <TableCell>
                        {row.currentMileage?.toLocaleString("sv-SE") || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.vin || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {previewRows.length > 50 && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Visar 50 av {previewRows.length} rader
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Importresultat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {result.imported}
                </div>
                <div className="text-xs text-gray-500">Importerade</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-500">
                  {result.skipped}
                </div>
                <div className="text-xs text-gray-500">Hoppade över</div>
              </div>
              {result.errors.length > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {result.errors.length}
                  </div>
                  <div className="text-xs text-gray-500">Fel</div>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-red-700 mb-2">Fel:</p>
                <ul className="text-sm text-red-600 space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Link href="/vehicles">
                <Button>Visa fordon</Button>
              </Link>
              <Button variant="outline" onClick={handleReset}>
                Importera fler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && !previewRows.length && !result && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 text-center">
              Bearbetar fil...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
