"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";

interface SettingsData {
  companyName: string;
  notifyEmailEnabled: boolean;
  notifyEmail: string | null;
  thresholdServiceWarning: number;
  thresholdServiceCritical: number;
  thresholdInspectionWarning: number;
  thresholdInspectionCritical: number;
  emailDigestFrequency: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Inställningar sparade" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Kunde inte spara" });
      }
    } catch {
      setMessage({ type: "error", text: "Nätverksfel" });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
            Inställningar
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">Laddar...</p>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
            Inställningar
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Konfigurera tröskelvärden och e-postnotifieringar
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Sparar..." : "Spara"}
        </Button>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-[13px] ring-1 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60"
              : "bg-red-50 text-red-700 ring-red-200/60"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Company info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Företagsinformation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Företagsnamn</Label>
            <Input
              value={settings.companyName}
              onChange={(e) =>
                setSettings({ ...settings, companyName: e.target.value })
              }
              placeholder="Mitt taxibolag AB"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Tröskelvärden för varningar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[12px] text-gray-500">
            Styr när fordon markeras som &quot;snart&quot; (gul) eller
            &quot;kritisk&quot; (röd) på instrumentpanelen.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service varning (km kvar)</Label>
              <Input
                type="number"
                value={settings.thresholdServiceWarning}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    thresholdServiceWarning: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Service kritisk (km kvar)</Label>
              <Input
                type="number"
                value={settings.thresholdServiceCritical}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    thresholdServiceCritical: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Besiktning varning (dagar kvar)</Label>
              <Input
                type="number"
                value={settings.thresholdInspectionWarning}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    thresholdInspectionWarning: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Besiktning kritisk (dagar kvar)</Label>
              <Input
                type="number"
                value={settings.thresholdInspectionCritical}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    thresholdInspectionCritical: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">E-postnotifieringar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="emailEnabled"
              checked={settings.notifyEmailEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notifyEmailEnabled: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900/10"
            />
            <Label htmlFor="emailEnabled">
              Aktivera e-postsammanfattning
            </Label>
          </div>

          {settings.notifyEmailEnabled && (
            <>
              <div className="space-y-2">
                <Label>E-postadress för notifieringar</Label>
                <Input
                  type="email"
                  value={settings.notifyEmail || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifyEmail: e.target.value || null,
                    })
                  }
                  placeholder="admin@example.se"
                />
              </div>
              <div className="space-y-2">
                <Label>Frekvens</Label>
                <Select
                  value={settings.emailDigestFrequency}
                  onValueChange={(v) =>
                    setSettings({ ...settings, emailDigestFrequency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Dagligen</SelectItem>
                    <SelectItem value="weekly">Veckovis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
