import { useState, useEffect, useRef } from "react";
import * as React from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "./ui/sidebar";
import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "./ui/breadcrumb";
import { Search, Plus, Grid, List, Image, Palette, Sparkles, Layers, Upload, Folder, RefreshCw, Database, AlertCircle, Download, X, FolderOpen, ArrowLeft, Home, ChevronRight, SlidersHorizontal, Settings, Sort, Zap, Package } from "./icons";
import { GiliLogo } from "./GiliLogo";
import { AboutModal } from "./AboutModal";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AssetGrid, type SortOption } from "./AssetGrid";
import { AssetDetailPanel } from "./AssetDetailPanel";
import { ProjectManager, type Project } from "./ProjectManager";
import { AssetProjectModal } from "./AssetProjectModal";
import { SharedSidebar } from "./SharedSidebar";
import { getAllAssets, initializeAssetSystem, getAssetCounts, exportAssetsToCSV, Asset } from "../utils/appwriteApi";
import { toast } from "sonner";

interface AssetDashboardProps {
  onNavigateToAssetManagement: () => void;
}



export function AssetDashboard({ onNavigateToAssetManagement }: AssetDashboardProps) {
  // Navigation state
  const [currentView, setCurrentView] = useState<"category" | "projects" | "project-detail">("category");
  const [selectedCategory, setSelectedCategory] = useState("All Assets");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  // The input itself stays bound to searchQuery for instant typing feedback;
  // the actual filtering (over the whole, potentially thousands-strong asset
  // list) only reacts to this debounced value, so typing doesn't re-filter
  // and re-sort on every single keystroke.
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [cardSize, setCardSize] = useState<number[]>([5]); // 5 columns by default

  
  // Data state
  const [assetCounts, setAssetCounts] = useState<Record<string, number>>({});
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('loading');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Brief "done!" confirmation shown right after the initial load finishes,
  // before the asset grid appears — purely cosmetic, doesn't affect data.
  const [justFinishedLoading, setJustFinishedLoading] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  // Modal state
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assetToOrganize, setAssetToOrganize] = useState<Asset | null>(null);

  // Load assets from the Appwrite database. Serves from a short-lived local cache
  // by default (see getAllAssets) so opening/reopening the app feels instant instead
  // of re-fetching everything every time. Pass forceRefresh=true to bypass it.
  const loadAssets = async (showLoading = true, forceRefresh = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      console.log('🚀 Loading assets from the Appwrite database...');

      // Initialize system first
      await initializeAssetSystem();

      // Get all assets
      const response = await getAllAssets({ forceRefresh });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load assets');
      }
      
      const loadedAssets = response.data || [];
      console.log(`✅ Loaded ${loadedAssets.length} assets from ${response.source || 'database'}`);
      
      setAssets(loadedAssets);
      setDataSource(response.source || 'database');
      
      // Calculate counts
      const counts = getAssetCounts(loadedAssets);
      setAssetCounts(counts);
      
    } catch (err) {
      console.error('🚨 Error loading assets:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assets';
      setError(errorMessage);
      
      // Set empty state
      setAssets([]);
      setDataSource('offline');
      setAssetCounts({
        "All Assets": 0,
        "Spot Illus": 0,
        "Micro Illustration": 0,
        "Icons": 0,
        "Supergraphic": 0,
        "Other": 0,
        "Projects": 0
      });
      
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV export
  const handleExportCSV = async () => {
    if (assets.length === 0) {
      toast.error("No assets to export", {
        description: "Please add some assets first before exporting."
      });
      return;
    }

    setIsExporting(true);
    
    try {
      toast.loading("Preparing CSV export...", {
        description: `Exporting ${assets.length} assets from ${dataSource === 'database' ? 'Database: Appwrite' : 'KV Store'}`
      });

      const result = await exportAssetsToCSV();
      
      if (result.success) {
        toast.success("CSV exported successfully!", {
          description: `Downloaded: ${result.filename || 'assets-export.csv'} (${assets.length} assets)`
        });
      } else {
        throw new Error(result.error || 'Export failed');
      }
      
    } catch (error) {
      console.error('🚨 Export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to export CSV';
      
      toast.error("Export failed", {
        description: errorMessage
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Load projects from localStorage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem("gili-projects");
    if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects);
        setProjects(parsedProjects);
      } catch (error) {
        console.error("Error loading projects:", error);
      }
    }
  }, []);

  // Update asset counts whenever projects or assets change
  useEffect(() => {
    const counts = getAssetCounts(assets);
    counts["Projects"] = projects.length;
    setAssetCounts(counts);
  }, [assets, projects]);

  // Load assets on component mount
  useEffect(() => {
    loadAssets();
  }, []);

  // Debounce the search query before it drives any filtering.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Show a brief "done!" checkmark the first time loading finishes, then let
  // the normal grid take over. Only fires once (not on every silent refresh).
  useEffect(() => {
    if (!loading && !hasLoadedOnceRef.current) {
      hasLoadedOnceRef.current = true;
      setJustFinishedLoading(true);
      const timer = setTimeout(() => setJustFinishedLoading(false), 700);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Refresh data when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadAssets(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleRefresh = () => {
    loadAssets(true, true); // force-bypass the cache — user explicitly asked for fresh data
  };

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
  };

  const handleCloseDetailPanel = () => {
    setSelectedAsset(null);
  };

  const handleTagClick = (tag: string) => {
    // Discrete action (not typing) — apply immediately, don't wait for the debounce.
    setSearchQuery(tag);
    setDebouncedSearchQuery(tag);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
  };

  // Navigation handlers
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setSelectedProject(null);
    if (category === "Projects") {
      setCurrentView("projects");
    } else {
      setCurrentView("category");
    }
  };

  const handleSelectProject = (project: Project | null) => {
    if (project) {
      setSelectedProject(project);
      setCurrentView("project-detail");
      toast.success("Project opened", {
        description: `Viewing ${project.asset_ids.length} assets in "${project.name}"`
      });
    } else {
      setSelectedProject(null);
      setCurrentView("projects");
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView("category");
    setSelectedCategory("All Assets");
    setSelectedProject(null);
  };

  const handleBackToProjects = () => {
    setCurrentView("projects");
    setSelectedProject(null);
  };

  const handleUpdateProjects = (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    localStorage.setItem("gili-projects", JSON.stringify(updatedProjects));
    if (selectedProject) {
      const updatedSelectedProject = updatedProjects.find(p => p.id === selectedProject.id);
      setSelectedProject(updatedSelectedProject || null);
    }
  };

  const handleAssetOrganize = (asset: Asset) => {
    setAssetToOrganize(asset);
  };

  const handleCreateNewProject = () => {
    setCurrentView("projects");
    setSelectedProject(null);
  };

  const handleNavigateToAllAssets = () => {
    setCurrentView("category");
    setSelectedCategory("All Assets");
    setSelectedProject(null);
  };

  // Generate breadcrumb items based on current state
  const getBreadcrumbItems = () => {
    const items = [];

    // "All Assets" IS the root, so it renders as a single "Home" crumb rather
    // than "Dashboard > All Assets" — the old version implied All Assets was a
    // child of the dashboard when it's the same screen.
    const atRoot = currentView === "category" && selectedCategory === "All Assets";

    items.push({
      label: "Home",
      icon: Home,
      onClick: atRoot ? null : handleBackToDashboard,
      isActive: atRoot
    });

    if (atRoot) return items;

    // Current view
    if (currentView === "projects") {
      items.push({
        label: "Projects",
        icon: FolderOpen,
        onClick: null,
        isActive: true
      });
    } else if (currentView === "project-detail" && selectedProject) {
      items.push({
        label: "Projects",
        icon: FolderOpen,
        onClick: handleBackToProjects,
        isActive: false
      });
      items.push({
        label: selectedProject.name,
        icon: Folder,
        onClick: null,
        isActive: true
      });
    } else {
      const categoryIcons: Record<string, any> = {
        "All Assets": Folder,
        "Spot Illus": Palette,
        "Micro Illustration": Sparkles,
        "Icons": Layers,
        "Supergraphic": Image,
        "Other": Package,
        "Projects": FolderOpen
      };

      items.push({
        label: selectedCategory,
        icon: categoryIcons[selectedCategory] || Folder,
        onClick: null,
        isActive: true
      });
    }

    return items;
  };

  // Determine what content to show
  const getPageTitle = () => {
    if (currentView === "projects") {
      return "Projects";
    } else if (currentView === "project-detail" && selectedProject) {
      return selectedProject.name;
    } else {
      return selectedCategory;
    }
  };


  const getAssetCount = () => {
    if (currentView === "project-detail" && selectedProject) {
      return `${selectedProject.asset_ids.length} project assets`;
    } else {
      return `${assets.length} total assets`;
    }
  };

  const getFilteredAssets = () => {
    if (currentView === "project-detail" && selectedProject) {
      return assets.filter(asset => selectedProject.asset_ids.includes(asset.nama_file));
    } else {
      return assets;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background">
        <SharedSidebar
          onNavigateToAssetManagement={onNavigateToAssetManagement}
          onCategoryClick={handleCategoryClick}
          selectedCategory={currentView === "projects" ? "Projects" : selectedCategory}
          assetCounts={assetCounts}
          assets={assets}
          loading={loading}
          error={error}
          dataSource={dataSource}
          handleRefresh={handleRefresh}
        />

        <SidebarInset>
          {/* Header with Search and Controls.
              sticky so the breadcrumb, count, sort and page controls stay
              reachable while you scroll a 50-card page — that's the cheap half
              of the "don't scroll so deep" fix, since this row exists anyway.
              NOTE: backdrop-filter creates a containing block for descendant
              fixed elements, which is exactly why the overlays are portalled to
              <body>. Don't un-portal them. */}
          <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {/* Mobile brand row.
                On mobile the sidebar is an off-canvas sheet, so the GILI
                wordmark is invisible until you open it — nothing tells you which
                app you're in. Desktop already shows it in the persistent
                sidebar, so this row is mobile-only to avoid duplicating it. */}
            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              title="About GILI"
              aria-label="About GILI"
              className="flex w-full items-center px-4 pt-4 pb-1 transition-opacity hover:opacity-80 focus-visible:outline-none lg:hidden"
            >
              <GiliLogo />
            </button>

            {/* Top row: Search and controls */}
            {/* Single row at every width. This used to be flex-col below lg, which
                pushed the view toggle onto its own second line on mobile and
                wasted ~50px of vertical space above the grid. */}
            <div className="flex h-auto flex-row items-center gap-2 px-4 py-3 lg:h-20 lg:gap-6 lg:px-7 lg:py-0">
              <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-6">
                {/* Sidebar Toggle Button - Outside sidebar */}
                <SidebarTrigger className="size-9 lg:size-10 hover:bg-accent/50 rounded-lg bg-transparent text-foreground shrink-0 flex items-center justify-center transition-colors" />


                {/* Large Search Bar - Now takes more space */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 lg:w-5 h-4 lg:h-5" />
                  <Input
                    placeholder="Search all assets, projects, and collections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 lg:pl-12 pr-10 lg:pr-12 h-10 lg:h-12 text-sm lg:text-base bg-card border border-border focus:ring-2 focus:ring-primary/20 rounded-xl"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSearch}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 lg:h-8 w-6 lg:w-8 p-0 hover:bg-gray-100 rounded-full"
                      title="Clear search"
                    >
                      <X className="h-3 lg:h-4 w-3 lg:w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Controls, far right of the same row */}
              <div className="flex shrink-0 items-center gap-2 lg:gap-3">
                {/* Card Size Slider - Only visible in grid view */}
                {viewMode === "grid" && (
                  <div className="hidden lg:flex items-center gap-2 px-3 py-2 border rounded-lg bg-background">
                    <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                    <div className="w-20">
                      <Slider
                        value={cardSize}
                        onValueChange={setCardSize}
                        min={4}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-center">
                      {cardSize[0]}
                    </span>
                  </div>
                )}
                
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-none h-8 lg:h-10 px-2 lg:px-4"
                    style={viewMode === "grid" ? {
                      background: 'var(--pp-bg-blue-high)',
                      color: 'white'
                    } : {}}
                  >
                    <Grid className="w-3 lg:w-4 h-3 lg:h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-none h-8 lg:h-10 px-2 lg:px-4 border-l"
                    style={viewMode === "list" ? {
                      background: 'var(--pp-bg-blue-high)',
                      color: 'white'
                    } : {}}
                  >
                    <List className="w-3 lg:w-4 h-3 lg:h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Bottom row: Breadcrumb Navigation */}
            <div className="px-4 lg:px-7 py-2 lg:py-3 border-t bg-muted/30">
              {/* Stacks on mobile, single row on desktop.
                  Inline at every width collided once a category name got long
                  ("Micro Illustration" + "4486 total assets" + sort doesn't fit
                  in 360px), so below the desktop breakpoint the count and sort
                  drop to their own line. */}
              <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center lg:justify-between">
                <Breadcrumb>
                  <BreadcrumbList>
                    {getBreadcrumbItems().map((item, index) => (
                      <div key={index} className="flex items-center">
                        {index > 0 && <BreadcrumbSeparator className="mx-1 lg:mx-2" />}
                        <BreadcrumbItem>
                          {item.isActive ? (
                            <BreadcrumbPage className="flex items-center gap-1 lg:gap-2 font-medium text-sm lg:text-base">
                              <item.icon className="w-3 lg:w-4 h-3 lg:h-4" />
                              <span className="truncate max-w-32 lg:max-w-none">{item.label}</span>
                            </BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink 
                              className="flex items-center gap-1 lg:gap-2 hover:text-foreground cursor-pointer text-sm lg:text-base"
                              onClick={item.onClick}
                            >
                              <item.icon className="w-3 lg:w-4 h-3 lg:h-4" />
                              <span className="truncate max-w-24 lg:max-w-none">{item.label}</span>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
                
                {/* Count + Sort share the right edge of the breadcrumb row.
                    Sort lives here rather than in its own row so it sits on the
                    same line as the thing it describes, and costs no extra
                    vertical space on mobile. */}
                <div className="flex shrink-0 items-center justify-between gap-2 lg:justify-end">
                  <Badge
                    variant="secondary"
                    className="shrink-0 px-2 py-1 text-xs lg:px-3 lg:text-sm"
                  >
                    {getAssetCount()}
                  </Badge>

                  {(currentView === "category" || currentView === "project-detail") && (
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                      <SelectTrigger className="h-8 w-auto gap-1.5 text-xs lg:h-9 lg:gap-2 lg:text-sm">
                        <Sort className="h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="alphabetical">Alphabetical</SelectItem>
                        <SelectItem value="type">By Type</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-4 lg:p-7">
              {currentView === "projects" && (
                <ProjectManager
                  assets={assets}
                  onSelectProject={handleSelectProject}
                  selectedProject={selectedProject}
                  onExportProject={() => {}}
                  projects={projects}
                  onUpdateProjects={handleUpdateProjects}
                />
              )}

              {(currentView === "category" || currentView === "project-detail") && (
                <>

                  {/* Error Alert */}
                  {error && (
                    <Alert className="mb-6 border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <div className="font-medium mb-1">Connection Error</div>
                        <div>{error}</div>
                        <Button 
                          size="sm" 
                          onClick={handleRefresh}
                          className="mt-2 h-8 bg-red-600 hover:bg-red-700"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Retry
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Asset Grid */}
                  <AssetGrid
                    category={currentView === "project-detail" ? "Project" : selectedCategory}
                    searchQuery={debouncedSearchQuery}
                    viewMode={viewMode}
                    sortBy={sortBy}
                    loading={loading}
                    justFinishedLoading={justFinishedLoading}
                    assets={getFilteredAssets()}
                    selectedAsset={selectedAsset}
                    onSelectAsset={handleSelectAsset}
                    onTagClick={handleTagClick}
                    onAssetOrganize={handleAssetOrganize}
                    projects={projects}
                    onUpdateProjects={handleUpdateProjects}
                    onCreateNewProject={handleCreateNewProject}
                    currentProject={currentView === "project-detail" ? selectedProject : undefined}
                    onNavigateToAllAssets={handleNavigateToAllAssets}
                    gridColumns={cardSize[0]}
                  />
                </>
              )}
            </div>
          </div>
        </SidebarInset>

        {/* About dialog — reachable from the mobile brand mark in the header,
            since on mobile the sidebar (and its version label) is hidden. */}
        <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

        {/* Asset Detail Panel */}
        <AssetDetailPanel
          asset={selectedAsset!}
          isOpen={!!selectedAsset}
          onClose={handleCloseDetailPanel}
          onTagClick={handleTagClick}
          onAssetOrganize={handleAssetOrganize}
        />

        {/* Asset Project Modal */}
        {assetToOrganize && (
          <AssetProjectModal
            isOpen={!!assetToOrganize}
            onClose={() => setAssetToOrganize(null)}
            asset={assetToOrganize}
            projects={projects}
            onUpdateProjects={handleUpdateProjects}
          />
        )}
      </div>
    </SidebarProvider>
  );
}