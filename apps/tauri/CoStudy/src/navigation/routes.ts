// Centralized navigation and route schema for consistent data flow
// Suitable for both web and mobile navigation consumers
// 遵循 Linus 原则：单一事实源，消除特殊情况

import type { ComponentType } from "react";
import {
  Home,
  Layers,
  Settings as SettingsIcon,
  Heart,
  Sparkles,
  Upload,
} from "lucide-react";

export type RouteId = "dashboard" | "decks" | "import" | "settings" | "philosophy";

export const RoutePaths: Record<RouteId, string> = {
  dashboard: "/dashboard",
  decks: "/decks", 
  import: "/import",
  settings: "/settings",
  philosophy: "/philosophy",
};

export type NavItem = {
  id: RouteId;
  path: string;
  icon: ComponentType<{ className?: string }>;
  i18nKey: string; // i18next key
  showInBottomBar?: boolean; // bottom nav visibility
  showInSidebar?: boolean; // desktop sidebar visibility
  requireAuth?: boolean; // 是否需要登录
};

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    path: RoutePaths.dashboard,
    icon: Home,
    i18nKey: "nav.dashboard",
    showInBottomBar: true,
    showInSidebar: true,
    requireAuth: true,
  },
  {
    id: "decks",
    path: RoutePaths.decks,
    icon: Layers,
    i18nKey: "nav.decks",
    showInBottomBar: true,
    showInSidebar: true,
    requireAuth: true,
  },
  {
    id: "import",
    path: RoutePaths.import,
    icon: Upload,
    i18nKey: "nav.import",
    showInBottomBar: true,
    showInSidebar: true,
    requireAuth: true,
  },
  {
    id: "philosophy",
    path: RoutePaths.philosophy,
    icon: Sparkles,
    i18nKey: "nav.philosophy",
    showInBottomBar: false,
    showInSidebar: true,
    requireAuth: true,
  },
  {
    id: "settings",
    path: RoutePaths.settings,
    icon: SettingsIcon,
    i18nKey: "nav.settings",
    showInBottomBar: false,
    showInSidebar: true,
    requireAuth: true,
  },
];

export function getBottomNavItems() {
  return NAV_ITEMS.filter((i) => i.showInBottomBar);
}

export function getSidebarNavItems() {
  return NAV_ITEMS.filter((i) => i.showInSidebar);
}

// 公共路由（不需要登录）
export const PUBLIC_ROUTES = [
  "/auth",
  "/auth/callback",
];

// 受保护路由（需要登录）
export const PROTECTED_ROUTES = [
  "/dashboard", 
  "/decks",
  "/import", 
  "/settings",
  "/philosophy",
  "/subscription",
  "/sync",
  "/pglite-test",
];

/**
 * 检查路由是否需要认证
 */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * 检查路由是否为公共路由
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}