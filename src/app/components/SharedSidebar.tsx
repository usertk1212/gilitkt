import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar } from './ui/sidebar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Plus, 
  Folder, 
  FolderOpen, 
  Palette, 
  Sparkles, 
  Layers, 
  RefreshCw, 
  Database, 
  Download, 
  ArrowLeft, 
  Settings 
} from 'lucide-react';
import { GiliLogo } from './GiliLogo';
import { Asset } from '../utils/supabaseApi';

interface SharedSidebarProps {
  onNavigateBack?: () => void;
  onNavigateToAssetManagement?: () => void;
  onCategoryClick: (category: string) => void;
  assetCounts: Record<string, number>;
  assets: Asset[];
  loading: boolean;
  error: string | null;
  dataSource: string;
  isExporting: boolean;
  handleRefresh: () => void;
  handleExportCSV: () => void;
  showBackButton?: boolean;
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
  isExporting, 
  handleRefresh, 
  handleExportCSV,
  showBackButton = false
}: SharedSidebarProps) {
  const { open } = useSidebar();

  const sidebarItems = [
    {
      title: "Asset Types",
      items: [
        { title: "All Assets", icon: Folder, count: assetCounts["All Assets"] || 0 },
        { title: "Spot Illus", icon: Palette, count: assetCounts["Spot Illus"] || 0 },
        { title: "Micro Illustration", icon: Sparkles, count: assetCounts["Micro Illustration"] || 0 },
        { title: "Icons", icon: Layers, count: assetCounts["Icons"] || 0 },
        { title: "Projects", icon: FolderOpen, count: assetCounts["Projects"] || 0 },
      ]
    }
  ];

  // Database status display logic
  const getDatabaseStatus = () => {
    switch (dataSource) {
      case 'database':
        return {
          text: 'Supabase',
          color: 'bg-green-500',
          isActive: true
        };
      case 'kv_store':
        return {
          text: 'Supabase',
          color: 'bg-green-500',
          isActive: true
        };
      case 'empty':
        return {
          text: 'Supabase',
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

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r"
    >
      {/* Sidebar Header with Gili Logo */}
      <SidebarHeader className="!flex !flex-row !items-center !justify-start !p-4 !min-h-[64px] !gap-2">
        <div className="flex items-center h-10 flex-shrink-0 justify-start w-full">
          <GiliLogo collapsed={!open} />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-0">
        {sidebarItems.map((group) => (
          <SidebarGroup key={group.title} className={open ? "px-0" : "px-0 py-2"}>
            {open && (
              <SidebarGroupLabel className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {group.title}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="px-0">
              <SidebarMenu 
                className={open ? "gap-0" : "gap-2 px-3 flex flex-col items-center"}
              >
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title} className={open ? "" : "w-full flex justify-center"}>
                    <SidebarMenuButton 
                      onClick={() => onCategoryClick(item.title)}
                      className={open 
                        ? "w-full justify-between px-4 py-2.5 mx-0 rounded-none hover:bg-accent/50 transition-all text-foreground"
                        : "w-12 h-12 p-0 justify-center rounded-lg hover:bg-accent/50 transition-all text-foreground flex items-center"
                      }
                      tooltip={!open ? item.title : undefined}
                    >
                      {open ? (
                        <>
                          <div className="flex items-center gap-3">
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </div>
                          <Badge variant="secondary" className="ml-auto text-xs px-2 py-0">
                            {item.count}
                          </Badge>
                        </>
                      ) : (
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      {/* Sidebar Footer */}
      <SidebarFooter className="p-0 mt-auto">
        <div className={open ? "p-3 space-y-2" : "px-3 pb-4 space-y-3 flex flex-col items-center"}>
          {/* Primary Action Button */}
          <Button 
            className={open ? "w-full justify-start h-8 py-1" : "w-10 h-10 p-0 shrink-0 rounded-lg flex items-center justify-center"}
            size="icon"
            onClick={showBackButton ? onNavigateBack : onNavigateToAssetManagement}
            title={!open ? (showBackButton ? "Back to Dashboard" : "Asset Management") : undefined}
            style={{
              background: 'linear-gradient(to right, #5BAAFF, #0062F6)',
              color: 'white',
              paddingTop: open ? '4px' : undefined,
              paddingBottom: open ? '4px' : undefined,
              paddingLeft: open ? '12px' : undefined,
              paddingRight: open ? '12px' : undefined
            }}
          >
            {showBackButton ? (
              <ArrowLeft className="w-5 h-5 shrink-0" />
            ) : (
              <Settings className="w-5 h-5 shrink-0" />
            )}
            {open && (
              <span className="ml-2 text-sm">
                {showBackButton ? "Back to Dashboard" : "Asset Management"}
              </span>
            )}
          </Button>
          
          {/* Export CSV Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleExportCSV}
            disabled={isExporting || assets.length === 0}
            className={open ? "w-full justify-start h-8 py-1" : "w-10 h-10 p-0 shrink-0 rounded-lg flex items-center justify-center"}
            title={!open ? "Export CSV" : (assets.length === 0 ? "No assets to export" : "Export all assets to CSV for manual editing")}
            style={{
              paddingTop: open ? '4px' : undefined,
              paddingBottom: open ? '4px' : undefined,
              paddingLeft: open ? '12px' : undefined,
              paddingRight: open ? '12px' : undefined
            }}
          >
            {isExporting ? (
              <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
            ) : (
              <Download className="w-5 h-5 shrink-0" />
            )}
            {open && <span className="ml-2 text-sm">Export CSV</span>}
          </Button>
          
          {/* Database Status Indicator */}
          <div className={open ? 'flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30' : 'flex flex-col items-center gap-1 py-1.5'}>
            {open ? (
              <>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span className="text-xs">
                    {dbStatus.text}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${dbStatus.color}`} />
                  <span className="text-xs text-muted-foreground">
                    {dbStatus.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Database className="w-5 h-5 text-muted-foreground" />
                <div className={`w-2 h-2 rounded-full ${dbStatus.color}`} />
                <span className="text-xs text-muted-foreground font-medium text-center leading-tight">
                  {dbStatus.isActive ? 'On' : 'Off'}
                </span>
              </>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}