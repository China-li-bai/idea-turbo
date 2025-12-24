import { NavLink } from "react-router-dom";
import { getSidebarNavItems } from "@/navigation/routes";
import { useTranslation } from "react-i18next";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export function SidebarNav() {
  const { t } = useTranslation();
  const items = getSidebarNavItems();
  return (
    <aside
      className="hidden md:block md:sticky md:top-0 md:h-screen md:w-56 md:border-r md:bg-background/60 md:backdrop-blur"
      aria-label={t("nav.sidebar")}
    >
      <div className="flex h-full flex-col p-3">
        <nav className="flex-1">
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon as any;
              return (
                <li key={item.id}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors " +
                      (isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground")
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t(item.i18nKey)}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

      </div>
    </aside>
  );
}