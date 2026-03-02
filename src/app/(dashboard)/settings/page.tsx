"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettingsData {
  companyName: string;
  organisationsnummer: string;
  contactEmail: string | null;
  serviceIntervalA: number;
  serviceIntervalB: number;
  notifyEmailEnabled: boolean;
  notifyOverdueService: boolean;
  notifyEmail: string | null;
  warningThresholdDays: number;
  emailDigestFrequency: string;
  language: string;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
      {label}
    </p>
  );
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-[13px] font-medium text-gray-900">{label}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
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

  const patch = (partial: Partial<SettingsData>) =>
    setSettings((s) => s && { ...s, ...partial });

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
          Inställningar
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">Laddar...</p>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
          Inställningar
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Hantera systemkonfiguration
        </p>
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

      {/* Företagsuppgifter */}
      <SettingCard>
        <SectionHeader label="Företagsuppgifter" />
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Företagsnamn</Label>
            <Input
              value={settings.companyName}
              onChange={(e) => patch({ companyName: e.target.value })}
              placeholder="Mitt taxibolag AB"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Organisationsnummer</Label>
              <Input
                value={settings.organisationsnummer}
                onChange={(e) => patch({ organisationsnummer: e.target.value })}
                placeholder="556123-4567"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kontakt-e-post</Label>
              <Input
                type="email"
                value={settings.contactEmail || ""}
                onChange={(e) =>
                  patch({ contactEmail: e.target.value || null })
                }
                placeholder="admin@taxifleet.se"
              />
            </div>
          </div>
        </div>
      </SettingCard>

      {/* Serviceintervall */}
      <SettingCard>
        <SectionHeader label="Serviceintervall" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Service A intervall (km)</Label>
            <Input
              type="number"
              value={settings.serviceIntervalA}
              onChange={(e) =>
                patch({ serviceIntervalA: parseInt(e.target.value) || 0 })
              }
              min={0}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Service B intervall (km)</Label>
            <Input
              type="number"
              value={settings.serviceIntervalB}
              onChange={(e) =>
                patch({ serviceIntervalB: parseInt(e.target.value) || 0 })
              }
              min={0}
            />
          </div>
        </div>
      </SettingCard>

      {/* Notifieringar */}
      <SettingCard>
        <SectionHeader label="Notifieringar" />
        <ToggleRow
          label="E-postnotifieringar"
          description="Daglig sammanfattning av kommande deadlines"
          checked={settings.notifyEmailEnabled}
          onCheckedChange={(v) => patch({ notifyEmailEnabled: v })}
        />
        <ToggleRow
          label="Varning vid försenad service"
          description="Omedelbar notifiering vid försenad kontroll"
          checked={settings.notifyOverdueService}
          onCheckedChange={(v) => patch({ notifyOverdueService: v })}
        />
        <div className="pt-4 space-y-1.5">
          <Label>Varningströskel (dagar)</Label>
          <Select
            value={String(settings.warningThresholdDays)}
            onValueChange={(v) =>
              patch({ warningThresholdDays: parseInt(v) })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 dag</SelectItem>
              <SelectItem value="7">7 dagar</SelectItem>
              <SelectItem value="14">14 dagar</SelectItem>
              <SelectItem value="30">30 dagar</SelectItem>
              <SelectItem value="60">60 dagar</SelectItem>
              <SelectItem value="90">90 dagar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingCard>

      {/* Språk & Format */}
      <SettingCard>
        <SectionHeader label="Språk & Format" />
        <div className="space-y-1.5">
          <Label>Språk</Label>
          <Select
            value={settings.language}
            onValueChange={(v) => patch({ language: v })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sv">Svenska</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingCard>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Sparar..." : "Spara inställningar"}
        </Button>
      </div>
    </div>
  );
}
