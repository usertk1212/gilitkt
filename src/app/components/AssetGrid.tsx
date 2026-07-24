import { useState, useEffect } from "react";
import { AssetCard } from "./AssetCard";
import { filterAssetsByCategory, searchAssets, Asset } from "../utils/appwriteApi";
import { type Project } from "./ProjectManager";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

export type SortOption = "recent" | "alphabetical" | "type";

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
  sortBy = "recent"
}: AssetGridProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Filter assets based on category and search query
  const filteredAssets = (() => {
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
  })();

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
      "Other": []
    };

    assets.forEach(asset => {
      if (asset.type === "Spot") {
        grouped.Spot.push(asset);
      } else if (asset.type === "Micro") {
        grouped.Micro.push(asset);
      } else if (asset.type === "Icon") {
        grouped.Icon.push(asset);
      } else {
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

  if (assets.length === 0) {
    return (
      <div className="text-center py-12">
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
              background: 'linear-gradient(to right, #5BAAFF, #0062F6)',
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
              background: 'linear-gradient(to right, #5BAAFF, #0062F6)',
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
    const typeOrder = ["Spot", "Micro", "Icon", "Other"];
    
    return (
      <div className="space-y-8">
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

  // Regular grid view for non-project categories
  return (
    <div className={
      viewMode === "grid" 
        ? getGridClasses()
        : "space-y-2"
    }>
      {filteredAssets.map(asset => (
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
  );
}