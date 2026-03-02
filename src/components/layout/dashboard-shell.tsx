"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { SearchModal } from "./search-modal";

interface DashboardShellProps {
  children: React.ReactNode;
  userRole: "admin" | "driver";
  userName: string;
}

export function DashboardShell({ children, userRole, userName }: DashboardShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        userRole={userRole}
        userName={userName}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <TopBar onSearchOpen={openSearch} sidebarCollapsed={collapsed} />
      <SearchModal open={searchOpen} onClose={closeSearch} />
      <main className="lg:pl-60 transition-all duration-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 pt-20 lg:pt-20">
          {children}
        </div>
      </main>
    </div>
  );
}
