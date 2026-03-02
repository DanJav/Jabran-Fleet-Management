"use client";

import { useEffect } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onSearchOpen: () => void;
  sidebarCollapsed: boolean;
}

export function TopBar({ onSearchOpen, sidebarCollapsed }: TopBarProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onSearchOpen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSearchOpen]);

  return (
    <div
      className={cn(
        "fixed top-0 right-0 z-30 h-14 border-b border-gray-200/80 bg-white/95 backdrop-blur-sm flex items-center px-4 transition-all duration-200",
        sidebarCollapsed ? "left-16" : "left-0 lg:left-60"
      )}
    >
      <button
        onClick={onSearchOpen}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 hover:border-gray-300 transition-colors w-48"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">Sök...</span>
        <kbd className="text-[11px] text-gray-300 font-mono">⌘K</kbd>
      </button>
    </div>
  );
}
