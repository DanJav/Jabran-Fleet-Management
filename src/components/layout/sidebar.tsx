"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Users,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Settings,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavItems: NavItem[] = [
  { label: "Översikt", href: "/dashboard", icon: LayoutDashboard },
  { label: "Fordon", href: "/vehicles", icon: Car },
  { label: "Förare", href: "/drivers", icon: Users },
  { label: "Kvitton", href: "/receipts", icon: Receipt },
  { label: "Inställningar", href: "/settings", icon: Settings },
];

interface SidebarProps {
  userRole: "admin" | "driver";
  userName: string;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
}

export function Sidebar({ userRole, userName, collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = userRole === "admin" ? adminNavItems : [
    { label: "Mina fordon", href: "/dashboard", icon: Car },
    { label: "Kvitton", href: "/receipts", icon: Receipt },
  ];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-[10px] left-4 z-50 lg:hidden rounded-lg p-2 bg-white border border-gray-200/80 shadow-sm"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200/80 bg-white transition-all duration-200",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm">TaxiFleet</span>
            </Link>
          )}
          <button
            onClick={() => {
              if (mobileOpen) setMobileOpen(false);
              else onCollapsedChange(!collapsed);
            }}
            className="rounded-lg p-1 hover:bg-gray-100 hidden lg:block"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 text-gray-500 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 hover:bg-gray-100 lg:hidden"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                onMouseEnter={() => router.prefetch(item.href)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-gray-900 text-white shadow-xs"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-3">
          {!collapsed && (
            <div className="mb-2 px-3 py-1">
              <p className="text-xs font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={cn("w-full", collapsed ? "justify-center" : "justify-start")}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-2">Logga ut</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
