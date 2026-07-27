import { useState, type ComponentType } from 'react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar } from './ui/sidebar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { GiliLogo } from './GiliLogo';
import { Asset } from '../utils/appwriteApi';
import { useTheme } from '../utils/useTheme';
import { cn } from './ui/utils';
import { APP_VERSION } from '../version';
import { AboutModal } from './AboutModal';
import { SyncStatusLine } from './SyncStatusLine';
import { ArrowLeft, BarChart3, Database, Download, Folder, Plus, FolderOpen, Image, KeyRound, Layers, Moon, Package, Palette, Settings, Sparkles, Sun, Trash2, Upload, Zap } from "./icons";

// "upload" (the old Upload Asset screen) was removed: it duplicated the CSV
// import that Upload CSV already does, and having two doors to the same job
// meant guessing which one was current. Its CSV template moved into CsvViewer.
export type AdminTab = "csv-viewer" | "manual-input" | "manage" | "analytics" | "backup" | "hard-reset" | "settings" | "about-image";

interface SidebarNavItem {
  key: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  count?: number;
  danger?: boolean;
}

interface SharedSidebarProps {
  onNavigateBack?: () => void;
  onNavigateToAssetManagement?: () => void;
  onCategoryClick: (category: string) => void;
  assetCounts: Record<string, number>;
  assets: Asset[];
  loading: boolean;
  error: string | null;
  dataSource: string;
  handleRefresh: () => void;
  showBackButton?: boolean;
  // Which item is currently highlighted, in either mode
  selectedCategory?: string;
  // Admin-mode navigation — when mode="admin", the sidebar shows Admin submenu
  // items (Upload CSV, Manage, Analytics, etc.) instead of the asset-type list.
  mode?: "dashboard" | "admin";
  activeAdminTab?: AdminTab;
  onAdminTabChange?: (tab: AdminTab) => void;
}

export function SharedSidebar({
  onNavigateBack,
  onNavigateToAssetManagement,
  onCategoryClick,
  assetCounts,
  assets,
  loading,
  error,
  dataSource,
  handleRefresh,
  showBackButton = false,
  selectedCategory,
  mode = "dashboard",
  activeAdminTab,
  onAdminTabChange
}: SharedSidebarProps) {
  const { open } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const isAdminMode = mode === "admin";

  const dashboardItems: SidebarNavItem[] = [
    { key: "All Assets", title: "All Assets", icon: Folder, count: assetCounts["All Assets"] || 0 },
    { key: "Spot Illus", title: "Spot Illus", icon: Palette, count: assetCounts["Spot Illus"] || 0 },
    { key: "Micro Illustration", title: "Micro Illustration", icon: Sparkles, count: assetCounts["Micro Illustration"] || 0 },
    { key: "Icons", title: "Icons", icon: Layers, count: assetCounts["Icons"] || 0 },
    { key: "Supergraphic", title: "Supergraphic", icon: Image, count: assetCounts["Supergraphic"] || 0 },
    { key: "Other", title: "Other", icon: Package, count: assetCounts["Other"] || 0 },
    { key: "Projects", title: "Projects", icon: FolderOpen, count: assetCounts["Projects"] || 0 },
  ];

  const adminItems: SidebarNavItem[] = [
    { key: "csv-viewer", title: "Upload CSV", icon: Upload },
    { key: "manual-input", title: "Manual Input", icon: Plus },
    { key: "manage", title: "Manage Asset", icon: Settings },
    { key: "analytics", title: "Analytics", icon: BarChart3 },
    { key: "backup", title: "Backup & Restore", icon: Download },
    { key: "about-image", title: "About Image", icon: Image },
  ];

  const adminDangerItems: SidebarNavItem[] = [
    { key: "hard-reset", title: "Hard Reset Database", icon: Trash2, danger: true },
  ];

  const adminSettingsItems: SidebarNavItem[] = [
    { key: "settings", title: "Settings", icon: KeyRound },
  ];


  const isItemActive = (item: SidebarNavItem) =>
    isAdminMode ? activeAdminTab === item.key : selectedCategory === item.title;

  const handleItemClick = (item: SidebarNavItem) => {
    if (isAdminMode) {
      onAdminTabChange?.(item.key as AdminTab);
    } else {
      onCategoryClick(item.title);
    }
  };

  // Database status display logic.
  //
  // NOTE: this switch must cover every `source` value getAllAssets() can return.
  // 1.0.23 added 'cache' / 'appwrite' / 'cache-offline' / 'cache-fallback' and
  // this list wasn't updated, so a perfectly healthy cache hit fell through to
  // the default branch and displayed a red "Offline" — alarming, and wrong.
  // stateLabel/shortLabel are optional overrides for the Active/Inactive wording.
  // Declared here so branches that don't set them still type-check.
  interface DatabaseStatus {
    text: string;
    color: string;
    isActive: boolean;
    stateLabel?: string;
    shortLabel?: string;
  }

  const getDatabaseStatus = (): DatabaseStatus => {
    switch (dataSource) {
      case 'database':
      case 'kv_store':
      case 'empty':
      case 'appwrite':
        return {
          text: 'Appwrite',
          color: 'bg-green-500',
          isActive: true
        };
      // Served from the local cache, but the server WAS reached — the freshness
      // check succeeded and reported no changes. That's online, not offline.
      case 'cache':
        return {
          text: 'Appwrite',
          color: 'bg-green-500',
          isActive: true
        };
      // Genuinely couldn't reach Appwrite; showing the last known copy.
      //
      // "Inactive" was misleading here: the app is working, it's just reading
      // local data. Only this branch overrides the label — every other case keeps
      // the plain Active/Inactive wording.
      case 'cache-offline':
      case 'cache-fallback':
        return {
          text: 'Cached copy',
          color: 'bg-yellow-500',
          isActive: false,
          stateLabel: 'Local',
          shortLabel: 'Local'
        };
      case 'loading':
        return {
          text: 'Connecting',
          color: 'bg-yellow-500',
          isActive: false
        };
      default:
        return {
          text: 'Offline',
          color: 'bg-red-500',
          isActive: false
        };
    }
  };

  const dbStatus = getDatabaseStatus();

  const renderMenuGroup = (label: string | null, items: SidebarNavItem[]) => (
    <SidebarGroup key={label ?? items[0]?.key} className={open ? "px-0" : "px-0 py-2"}>
      {open && label && (
        <SidebarGroupLabel className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium transition-opacity duration-200">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent className="px-0">
        <SidebarMenu
          className={open ? "gap-0" : "gap-2 px-3 flex flex-col items-center"}
        >
          {items.map((item) => {
            const active = isItemActive(item);
            return (
              <SidebarMenuItem key={item.key} className={open ? "" : "w-full flex justify-center"}>
                <SidebarMenuButton
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "transition-all duration-200 ease-linear text-foreground",
                    open
                      ? "w-full justify-between px-4 py-2.5 mx-0 rounded-none hover:bg-accent/50"
                      : "w-12 h-12 p-0 justify-center rounded-lg hover:bg-accent/50 flex items-center",
                    item.danger && !active && "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30",
                    active && !item.danger && "bg-accent text-accent-foreground dark:bg-blue-500/15 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/15",
                    active && item.danger && "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40",
                    open && active && !item.danger && "border-l-4 border-[var(--pp-brand-blue)] pl-3",
                    open && active && item.danger && "border-l-4 border-red-500 pl-3"
                  )}
                  tooltip={!open ? item.title : undefined}
                >
                  {open ? (
                    <>
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </div>
                      {item.count !== undefined && (
                        <Badge variant="secondary" className="ml-auto text-xs px-2 py-0">
                          {item.count}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar
      collapsible="icon"
      className="border-r"
    >
      {/* Sidebar Header with Gili Logo */}
      <SidebarHeader className="!flex !flex-row !items-center !justify-start !p-4 !min-h-[64px] !gap-2">
        <div className="flex items-center h-10 flex-shrink-0 justify-start w-full transition-all duration-200 ease-linear">
          <GiliLogo collapsed={!open} />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-0">
        {isAdminMode ? (
          <>
            {renderMenuGroup("Admin Menu", adminItems)}
            {renderMenuGroup("Danger Zone", adminDangerItems)}
            {renderMenuGroup(null, adminSettingsItems)}
          </>
        ) : (
          renderMenuGroup("Asset Types", dashboardItems)
        )}
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="p-0 mt-auto">
        <div className={open ? "p-3 space-y-2" : "px-3 pb-4 space-y-3 flex flex-col items-center"}>
          {/* Primary Action Button */}
          <Button
            className={cn(
              "transition-all duration-200 ease-linear",
              open ? "w-full justify-start h-8 py-1 px-3" : "w-10 h-10 p-0 shrink-0 rounded-lg flex items-center justify-center"
            )}
            size="icon"
            onClick={showBackButton ? onNavigateBack : onNavigateToAssetManagement}
            title={!open ? (showBackButton ? "Back to Dashboard" : "Superuser") : undefined}
            style={{
              background: 'var(--pp-bg-blue-high)',
              color: 'white'
            }}
          >
            {showBackButton ? (
              <ArrowLeft className="w-5 h-5 shrink-0" />
            ) : (
              <Zap className="w-5 h-5 shrink-0" />
            )}
            {open && (
              <span className="ml-2 text-sm">
                {showBackButton ? "Back to Dashboard" : "Superuser"}
              </span>
            )}
          </Button>

          {/* Dark Mode Toggle */}
          <Button
            variant="outline"
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={cn(
              "transition-all duration-200 ease-linear",
              open ? "w-full justify-start h-8 py-1 px-3" : "w-10 h-10 p-0 shrink-0 rounded-lg flex items-center justify-center"
            )}
          >
            {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {open && (
              <span className="ml-2 text-sm">
                {isDark ? "Light Mode" : "Dark Mode"}
              </span>
            )}
          </Button>

          {/* Database Status Indicator */}
          <div className={cn(
            "transition-all duration-200 ease-linear",
            open ? 'flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30' : 'flex flex-col items-center gap-1 py-1.5'
          )}>
            {open ? (
              <>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span className="text-xs">
                    {dbStatus.text}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${dbStatus.color} transition-colors duration-200`} />
                  <span className="text-xs text-muted-foreground">
                    {dbStatus.stateLabel ?? (dbStatus.isActive ? 'Active' : 'Inactive')}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Database className="w-5 h-5 text-muted-foreground" />
                <div className={`w-2 h-2 rounded-full ${dbStatus.color} transition-colors duration-200`} />
                <span className="text-xs text-muted-foreground font-medium text-center leading-tight">
                  {dbStatus.shortLabel ?? (dbStatus.isActive ? 'On' : 'Off')}
                </span>
              </>
            )}
          </div>

          <SyncStatusLine open={open} />

          {/* Build version — clickable, opens the About dialog. */}
          <button
            type="button"
            onClick={() => setIsAboutOpen(true)}
            title="About GILI"
            className={cn(
              "w-full rounded-[4px] text-muted-foreground/70 transition-all duration-200 ease-linear hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              open ? "px-2 pt-0.5 text-left text-[11px]" : "pt-0.5 text-center text-[10px]"
            )}
          >
            {open ? `GILI v${APP_VERSION}` : `v${APP_VERSION}`}
          </button>
        </div>
      </SidebarFooter>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </Sidebar>
  );
}
