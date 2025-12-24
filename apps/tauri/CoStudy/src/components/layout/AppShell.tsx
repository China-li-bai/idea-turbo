import { PropsWithChildren } from "react";
import { SidebarNav } from "@/components/navigation/SidebarNav";
import { BottomNav } from "@/components/navigation/BottomNav";

/**
 * AppShell: Universal navigation container for web & mobile
 * - Desktop: left sidebar nav
 * - Mobile: bottom nav bar with safe-area
 * Pages can still render their own top app bar; AppShell focuses on global nav
 */
export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="relative flex min-h-screen w-full bg-background dark:bg-background">
      {/* Desktop Sidebar */}
      <SidebarNav />

      {/* Content */}
      <div className="flex-1">
        {children}
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
}