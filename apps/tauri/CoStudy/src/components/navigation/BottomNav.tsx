import { Link, useLocation } from "react-router-dom";
import { getBottomNavItems } from "@/navigation/routes";
import { useTranslation } from "react-i18next";

export function BottomNav() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const items = getBottomNavItems();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-slate-800"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={t("nav.bottom")}
    >
      <div className="mx-auto max-w-screen-sm px-6 py-2">
        <ul className="flex items-center justify-between gap-6">
          {items.map((item) => {
            const active = pathname === item.path;
            const Icon = item.icon as any;
            return (
              <li key={item.id} className="flex-1">
                <Link
                  to={item.path}
                  aria-label={t(item.i18nKey)}
                  className={
                    "group flex w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition-colors " +
                    (active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{t(item.i18nKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}