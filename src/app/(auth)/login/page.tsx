"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Waypoints } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Felaktigt e-post eller lösenord");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="rounded-xl bg-blue-50 p-3 mb-4 ring-1 ring-blue-200/50">
            <Waypoints className="h-5 w-5 text-blue-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight">TaxiFleet</h1>
          <p className="text-[13px] text-gray-500 mt-1">Logga in för att fortsätta</p>
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                placeholder="din@email.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Lösenord</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200/60">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loggar in..." : "Logga in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
