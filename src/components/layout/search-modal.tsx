"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Car, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface VehicleResult {
  id: string;
  registrationNumber: string;
  make: string | null;
  model: string | null;
}

interface DriverResult {
  id: string;
  name: string;
  email: string;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [vehicles, setVehicles] = useState<VehicleResult[]>([]);
  const [drivers, setDrivers] = useState<DriverResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase.from("vehicles").select("id, registration_number, make, model").eq("is_active", true),
      supabase.from("drivers").select("id, name, email").eq("is_active", true),
    ]).then(([v, d]) => {
      if (cancelled) return;
      if (v.error) console.error("vehicles fetch failed", v.error);
      if (d.error) console.error("drivers fetch failed", d.error);
      setVehicles(
        (v.data ?? []).map((r) => ({
          id: r.id,
          registrationNumber: r.registration_number,
          make: r.make,
          model: r.model,
        }))
      );
      setDrivers(d.data ?? []);
      setQuery("");
      setActiveIndex(0);
    }).catch((err) => {
      if (!cancelled) console.error("search fetch failed", err);
    });
    setTimeout(() => inputRef.current?.focus(), 0);
    return () => { cancelled = true; };
  }, [open]);

  const filteredVehicles = vehicles.filter((v) => {
    const q = query.toLowerCase();
    return (
      v.registrationNumber.toLowerCase().includes(q) ||
      v.make?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q)
    );
  });

  const filteredDrivers = drivers.filter((d) => {
    const q = query.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q);
  });

  type ResultItem =
    | { kind: "vehicle"; item: VehicleResult }
    | { kind: "driver"; item: DriverResult };

  const allResults: ResultItem[] = [
    ...filteredVehicles.map((v) => ({ kind: "vehicle" as const, item: v })),
    ...filteredDrivers.map((d) => ({ kind: "driver" as const, item: d })),
  ];

  const navigate = useCallback(
    (result: ResultItem) => {
      if (result.kind === "vehicle") {
        router.push(`/vehicles/${result.item.id}`);
      } else {
        router.push(`/drivers/${result.item.id}`);
      }
      onClose();
    },
    [router, onClose]
  );

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setActiveIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allResults[activeIndex]) {
      navigate(allResults[activeIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  const hasResults = allResults.length > 0;
  const showEmpty = query.length > 0 && !hasResults;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Sök fordon, förare..."
            className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
          />
          <button
            onClick={onClose}
            aria-label="Stäng sök"
            className="rounded p-1 hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {showEmpty && (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              Inga resultat för &quot;{query}&quot;
            </p>
          )}

          {filteredVehicles.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Fordon
              </p>
              {filteredVehicles.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => navigate({ kind: "vehicle", item: v })}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors",
                    activeIndex === i && "bg-gray-100"
                  )}
                >
                  <Car className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-900 font-mono">
                    {v.registrationNumber}
                  </span>
                  {(v.make || v.model) && (
                    <span className="text-sm text-gray-500">
                      {[v.make, v.model].filter(Boolean).join(" ")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {filteredDrivers.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Förare
              </p>
              {filteredDrivers.map((d, j) => (
                <button
                  key={d.id}
                  onClick={() => navigate({ kind: "driver", item: d })}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors",
                    activeIndex === filteredVehicles.length + j && "bg-gray-100"
                  )}
                >
                  <Users className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-900">{d.name}</span>
                  <span className="text-sm text-gray-500">{d.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
