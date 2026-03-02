"use client";

import { Car } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function NoAccountPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-xl bg-violet-50 p-3 ring-1 ring-violet-200/50">
            <Car className="h-5 w-5 text-violet-600" />
          </div>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Kontot hittades inte</h1>
        <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">
          Ditt konto är inte registrerat i systemet.
          <br />
          Kontakta administratören för att få åtkomst.
        </p>
        <Button variant="outline" size="sm" className="mt-6" onClick={handleSignOut}>
          Logga ut
        </Button>
      </div>
    </div>
  );
}
