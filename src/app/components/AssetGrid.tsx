import { useState, useEffect, useMemo } from "react";
import { AssetCard } from "./AssetCard";
import { filterAssetsByCategory, searchAssets, Asset } from "../utils/appwriteApi";
import { type Project } from "./ProjectManager";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Loader2, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "./icons";

export type SortOption = "recent" | "alphabetical" | "type";

const PAGE_SIZE = 100;

interface AssetGridProps {
  category: string;
  searchQuery: string;
  viewMode: "grid" | "list";
  assets: Asset[]; // Accept assets as props instead of loading internally
  selectedAsset?: Asset | null;
  onSelectAsset?: (asset: Asset) => void;
  onTagClick?: (tag: string) => void;
  onAssetOrganize?: (asset: Asset) => void;
  projects?: Project[];
  onUpdateProjects?: (projects: Project[]) => void;
  onCreateNewProject?: () => void;
  currentProject?: Project; // Add current project context
  onNavigateToAllAssets?: () => void; // Add navigation callback
  gridColumns?: number; // Add grid columns prop
  sortBy?: SortOption;
  loading?: boolean; // Still fetching from the database — show a loading state instead of "No assets"
  justFinishedLoading?: boolean; // Brief "done!" checkmark right after loading completes
}

export function AssetGrid({
  category,
  searchQuery,
  viewMode,
  assets,
  selectedAsset,
  onSelectAsset,
  onTagClick,
  onAssetOrganize,
  projects = [],
  onUpdateProjects,
  onCreateNewProject,
  currentProject,
  onNavigateToAllAssets,
  gridColumns = 5,
  sortBy = "recent",
  loading = false,
  justFinishedLoading = false
}: AssetGridProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [jumpToPageInput, setJumpToPageInput] = useState("");

  // Filter + sort assets based on category, search query, and sort option.
  // Memoized so this (potentially thousands-of-rows) computation only reruns
  // when something it actually depends on changes — not on every render
  // (e.g. hovering a card, opening a dropdown elsewhere on the page).
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Apply search filter
    if (searchQuery) {
      filtered = searchAssets(filtered, searchQuery);
    }

    // Apply category filter
    if (category === "Favorites") {
      filtered = filtered.filter(asset => favorites.has(asset.nama_file));
    } else if (category !== "Project") {
      filtered = filterAssetsByCategory(filtered, category);
    }
    // For "Project" category, we don't filter by type as we want to show all project assets

    // Apply sort (based on real data — created_at comes from Appwrite's $createdAt)
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "alphabetical") {
        return (a.asset_name || a.nama_file).localeCompare(b.asset_name || b.nama_file);
      }
      if (sortBy === "type") {
        const typeCompare = (a.type || "").localeCompare(b.type || "");
        return typeCompare !== 0 ? typeCompare : (a.asset_name || a.nama_file).localeCompare(b.asset_name || b.nama_file);
      }
      // "recent" (default): newest first
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    return filtered;
  }, [assets, searchQuery, category, favorites, sortBy]);

  // Reset to page 1 whenever the underlying filtered set changes basis —
  // otherwise you could land on a page that no longer exists.
  useEffect(() => {
    setPage(1);
  }, [category, searchQuery, sortBy]);

  const totalAssetPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const safePage = Math.min(page, totalAssetPages);
  const pagedAssets = useMemo(
    () => filteredAssets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredAssets, safePage]
  );

  const goToAssetPage = (target: number) => {
    setPage(Math.max(1, Math.min(totalAssetPages, target)));
  };

  const handleJumpToAssetPage = () => {
    const parsed = parseInt(jumpToPageInput, 10);
    if (!isNaN(parsed)) {
      goToAssetPage(parsed);
    }
    setJumpToPageInput("");
  };

  const toggleFavorite = (nama_file: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(nama_file)) {
        newFavorites.delete(nama_file);
      } else {
        newFavorites.add(nama_file);
      }
      return newFavorites;
    });
  };

  // Group assets by type for project view
  const groupAssetsByType = (assets: Asset[]) => {
    const grouped: Record<string, Asset[]> = {
      "Spot": [],
      "Micro": [],
      "Icon": [],
      "Supergraphic": [],
      "Other": []
    };

    assets.forEach(asset => {
      if (asset.type === "Spot") {
        grouped.Spot.push(asset);
      } else if (asset.type === "Micro") {
        grouped.Micro.push(asset);
      } else if (asset.type === "Icon") {
        grouped.Icon.push(asset);
      } else if (asset.type === "Supergraphic") {
        grouped.Supergraphic.push(asset);
      } else {
        // "Other" plus anything unrecognized (e.g. "General") falls in here.
        grouped.Other.push(asset);
      }
    });

    // Remove empty groups
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length === 0) {
        delete grouped[key];
      }
    });

    return grouped;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "Spot":
        return "Spot Illustrations";
      case "Micro":
        return "Micro Illustrations";
      case "Icon":
        return "Icons";
      case "Supergraphic":
        return "Supergraphic";
      case "Other":
        return "Other";
      default:
        return type;
    }
  };

  const getTypeDescription = (type: string) => {
    switch (type) {
      case "Spot":
        return "Complex scenes and detailed illustrations";
      case "Micro":
        return "Simple concepts and micro illustrations";
      case "Icon":
        return "Interface elements and icons";
      case "Supergraphic":
        return "Large-format banners and graphic assets";
      default:
        return "Other asset types";
    }
  };

  // Determine if we're in project context
  const isProjectView = category === "Project" && currentProject;

  // Generate dynamic grid classes based on gridColumns
  const getGridClasses = () => {
    const baseClasses = "grid gap-3 lg:gap-4";
    const columnClasses = {
      4: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", // Largest cards (4 columns max)
      5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5", // Large cards
      6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6", // Default medium cards
      7: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7", // Small cards
      8: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 4xl:grid-cols-8", // Smaller cards
      9: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-9", // Very small cards
      10: "grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-9 4xl:grid-cols-10" // Smallest cards
    };
    
    return `${baseClasses} ${columnClasses[gridColumns as keyof typeof columnClasses] || columnClasses[6]}`;
  };

  // Still fetching from the database — don't flash "No assets available" while
  // the real data is on its way in. Show a clear loading state instead.
  if (loading && assets.length === 0) {
    return (
      <div className="text-center py-20 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--pp-brand-blue)' }} />
        <div>
          <h3 className="mb-1">Menyiapkan asset kamu...</h3>
          <p className="text-muted-foreground text-sm">
            we're still preparing the assets for you, hang tight
          </p>
        </div>
      </div>
    );
  }

  // Brief confirmation right after loading finishes, before the grid appears.
  if (justFinishedLoading) {
    return (
      <div className="text-center py-20 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
        <p className="text-sm text-muted-foreground">Selesai! Menampilkan asset kamu...</p>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-12 animate-in fade-in duration-300">
        <div className="text-muted-foreground mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="mb-2">No assets available</h3>
        <p className="text-muted-foreground mb-4">
          Start by uploading your first assets to the library
        </p>

        {/* Show "Browse All Assets" button when viewing an empty project */}
        {category === "Project" && onNavigateToAllAssets && (
          <Button
            onClick={onNavigateToAllAssets}
            style={{
              background: 'var(--pp-bg-blue-high)',
              color: 'white'
            }}
          >
            Browse All Assets
          </Button>
        )}
      </div>
    );
  }

  if (filteredAssets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="mb-2">No assets found</h3>
        <p className="text-muted-foreground mb-4">
          {searchQuery 
            ? `No assets match "${searchQuery}". Try different search terms.`
            : category === "Favorites"
              ? "No favorites yet. Click the star icon on assets to add them to favorites."
              : category === "Project"
                ? "This project is empty. Browse all assets to find and add items to your project."
                : `No assets found in the ${category} category.`
          }
        </p>
        
        {/* Show "Browse All Assets" button when viewing an empty project (both cases) */}
        {category === "Project" && onNavigateToAllAssets && (
          <Button 
            onClick={onNavigateToAllAssets}
            style={{
              background: 'var(--pp-bg-blue-high)',
              color: 'white'
            }}
          >
            Browse All Assets
          </Button>
        )}
      </div>
    );
  }

  // For project view, group assets by type
  if (category === "Project") {
    const groupedAssets = groupAssetsByType(filteredAssets);
    const typeOrder = ["Spot", "Micro", "Icon", "Supergraphic", "Other"];
    
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {typeOrder.map(type => {
          const assetsForType = groupedAssets[type];
          if (!assetsForType || assetsForType.length === 0) return null;

          return (
            <div key={type} className="space-y-4">
              {/* Section Header */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {getTypeLabel(type)}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {assetsForType.length} asset{assetsForType.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getTypeDescription(type)}
                  </p>
                </div>
              </div>

              {/* Assets Grid */}
              <div className={
                viewMode === "grid" 
                  ? getGridClasses()
                  : "space-y-2"
              }>
                {assetsForType.map(asset => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    viewMode={viewMode}
                    isFavorite={favorites.has(asset.nama_file)}
                    isSelected={selectedAsset?.nama_file === asset.nama_file}
                    onToggleFavorite={toggleFavorite}
                    onSelect={onSelectAsset}
                    onTagClick={onTagClick}
                    onAssetOrganize={onAssetOrganize}
                    projects={projects}
                    onUpdateProjects={onUpdateProjects}
                    onCreateNewProject={onCreateNewProject}
                    isInProject={isProjectView}
                    currentProject={currentProject}
                    gridColumns={gridColumns}
                  />
                ))}
              </div>

              {/* Separator between sections (except for the last section) */}
              {type !== typeOrder[typeOrder.length - 1] && groupedAssets[typeOrder[typeOrder.indexOf(type) + 1]] && (
                <Separator className="my-8" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Regular grid view for non-project categories — paginated so a huge
  // category (thousands of assets) doesn't mount every card at once.
  return (
    <div className="space-y-4">
      <div className={
        (viewMode === "grid"
          ? getGridClasses()
          : "space-y-2") + " animate-in fade-in duration-300"
      }>
        {pagedAssets.map(asset => (
          <AssetCard
            key={asset.id}
            asset={asset}
            viewMode={viewMode}
            isFavorite={favorites.has(asset.nama_file)}
            isSelected={selectedAsset?.nama_file === asset.nama_file}
            onToggleFavorite={toggleFavorite}
            onSelect={onSelectAsset}
            onTagClick={onTagClick}
            onAssetOrganize={onAssetOrganize}
            projects={projects}
            onUpdateProjects={onUpdateProjects}
            onCreateNewProject={onCreateNewProject}
            isInProject={false}
            currentProject={undefined}
            gridColumns={gridColumns}
          />
        ))}
      </div>

      {totalAssetPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToAssetPage(1)}
              disabled={safePage <= 1}
              title="Halaman pertama"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToAssetPage(safePage - 1)}
              disabled={safePage <= 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Sebelumnya
            </Button>
          </div>

          <span className="text-sm text-muted-foreground">
            Halaman {safePage} / {totalAssetPages} ({filteredAssets.length} asset)
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToAssetPage(safePage + 1)}
              disabled={safePage >= totalAssetPages}
            >
              Berikutnya
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToAssetPage(totalAssetPages)}
              disabled={safePage >= totalAssetPages}
              title="Halaman terakhir"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
            <Input
              type="number"
              min={1}
              max={totalAssetPages}
              placeholder={`1-${totalAssetPages}`}
              value={jumpToPageInput}
              onChange={(e) => setJumpToPageInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJumpToAssetPage()}
              className="w-20 h-9"
            />
            <Button variant="outline" size="sm" onClick={handleJumpToAssetPage}>
              Ke Halaman
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}