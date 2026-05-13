import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  ListChecks,
  Play,
  Database,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Settings,
  Building2,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/lib/project-context";
import { LanguageSwitcher } from "./language-switcher";
import { useState } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, labelKey: "sidebar.nav.dashboard" },
  { to: "/projects", icon: FolderOpen, labelKey: "sidebar.nav.projects" },
  { to: "/test-cases", icon: FileText, labelKey: "sidebar.nav.testCases", needsProject: true },
  { to: "/suites", icon: ListChecks, labelKey: "sidebar.nav.suites", needsProject: true },
  { to: "/runs", icon: Play, labelKey: "sidebar.nav.runs" },
  { to: "/datasets", icon: Database, labelKey: "sidebar.nav.datasets", needsProject: true },
  { to: "/baselines", icon: ImageIcon, labelKey: "sidebar.nav.baselines", needsProject: true },
  { to: "/ai/providers", icon: Building2, labelKey: "sidebar.nav.aiProviders" },
  { to: "/ai/settings", icon: Settings, labelKey: "sidebar.nav.aiSettings", needsProject: true },
  { to: "/ai/knowledge", icon: BookOpen, labelKey: "sidebar.nav.knowledge", needsProject: true },
  { to: "/ai/generate", icon: Sparkles, labelKey: "sidebar.nav.aiGenerate", needsProject: true },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { current } = useProject();
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-primary">
            AI-Tester
          </span>
        )}
        {collapsed && (
          <span className="mx-auto text-lg font-bold text-primary">AT</span>
        )}
      </div>

      {/* Current project indicator */}
      {!collapsed && current && (
        <div className="border-b px-4 py-2">
          <p className="text-xs text-muted-foreground">{t("sidebar.currentProject")}</p>
          <p className="truncate text-sm font-medium">{current.name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const disabled = item.needsProject && !current;
          return (
            <NavLink
              key={item.to}
              to={disabled ? "#" : item.to}
              onClick={(e) => disabled && e.preventDefault()}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive && !disabled
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  disabled && "cursor-not-allowed opacity-40"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Language switcher */}
      <div className="px-2 py-1">
        <LanguageSwitcher collapsed={collapsed} />
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-10 items-center justify-center border-t text-muted-foreground hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
