import type { ComponentType } from 'react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar } from './ui/sidebar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { GiliLogo } from './GiliLogo';
import { Asset } from '../utils/appwriteApi';
import { useTheme } from '../utils/useTheme';
import { cn } from './ui/utils';
import { APP_VERSION } from '../version';
import { ArrowLeft, BarChart3, Database, Download, Eye, Folder, FolderOpen, Image, KeyRound, Layers, Moon, Package, Palette, Settings, Sparkles, Sun, Trash2, Upload } from "./icons";

export type AdminTab = "upload" | "manage" | "analytics" | "csv-viewer" | "export" | "hard-reset" | "settings";

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
  // items (Upload, Manage, Analytics, etc.) instead of the asset-type list.
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
    { key: "upload", title: "Upload Asset", icon: Upload },
    { key: "csv-viewer", title: "CSV Viewer", icon: Eye },
    { key: "manage", title: "Manage Asset", icon: Settings },
    { key: "analytics", title: "Analytics", icon: BarChart3 },
    { key: "export", title: "Export CSV", icon: Download },
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

  // Database status display logic
  const getDatabaseStatus = () => {
    switch (dataSource) {
      case 'database':
        return {
          text: 'Appwrite',
          color: 'bg-green-500',
          isActive: true
        };
      case 'kv_store':
        return {
          text: 'Appwrite',
          color: 'bg-green-500',
          isActive: true
        };
      case 'empty':
        return {
          text: 'Appwrite',
          color: 'bg-green-500',
          isActive: true
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
            title={!open ? (showBackButton ? "Back to Dashboard" : "Admin") : undefined}
            style={{
              background: 'var(--pp-grad-brand)',
              color: 'white'
            }}
          >
            {showBackButton ? (
              <ArrowLeft className="w-5 h-5 shrink-0" />
            ) : (
              <Settings className="w-5 h-5 shrink-0" />
            )}
            {open && (
              <span className="ml-2 text-sm">
                {showBackButton ? "Back to Dashboard" : "Admin"}
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
                    {dbStatus.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Database className="w-5 h-5 text-muted-foreground" />
                <div className={`w-2 h-2 rounded-full ${dbStatus.color} transition-colors duration-200`} />
                <span className="text-xs text-muted-foreground font-medium text-center leading-tight">
                  {dbStatus.isActive ? 'On' : 'Off'}
                </span>
              </>
            )}
          </div>

          {/* Build version — so it's obvious which handover you're looking at. */}
          <div className={cn(
            "text-muted-foreground/70 transition-all duration-200 ease-linear",
            open ? "px-2 pt-0.5 text-[11px]" : "pt-0.5 text-[10px] text-center"
          )}>
            {open ? `GILI v${APP_VERSION}` : `v${APP_VERSION}`}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
