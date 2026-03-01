"use client";

import { Sidebar } from "./sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  userRole: "admin" | "driver";
  userName: string;
}

export function DashboardShell({ children, userRole, userName }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} userName={userName} />
      <main className="lg:pl-60 transition-all duration-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
