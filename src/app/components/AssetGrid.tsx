import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { AssetCard } from "./AssetCard";
import { filterAssetsByCategory, searchAssets, Asset } from "../utils/appwriteApi";
import { lastTouchedAt } from "../utils/assetNaming";
import { type Project } from "./ProjectManager";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Loader2, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "./icons";

export type SortOption = "recent" | "alphabetical" | "type";

// 50, not 100. At 100 the grid ran ~6300px tall at default density — seven
// screens of scrolling before the pager. 50 halves that, and with jump-to-page
// the extra page count costs nothing.
const PAGE_SIZE = 50;

interface AssetGridProps {
  category: string;
  searchQuery: string;
  viewMode: "grid" | "list";
  assets: Asset[]; // Accept assets as props instead of loading internally
  selectedAsset?: Asset | null;
  onSelectAsset?: (asset: Asset) => void;
  onTagClick?: (tag: string) => void;
  /** Lowercased tags currently switched on, forwarded to every card. */
  activeTags?: string[];
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
  activeTags = [],
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
  const gridTopRef = useRef<HTMLDivElement>(null);

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
      // "recent" (default): most recently touched first.
      //
      // Deliberately last-TOUCHED, not last-created. An asset that was
      // re-uploaded to Lightroom and relinked has new artwork but an old
      // created_at, so sorting on creation alone hid exactly the changes people
      // most want to see. See lastTouchedAt().
      return lastTouchedAt(b) - lastTouchedAt(a);
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
    const next = Math.max(1, Math.min(totalAssetPages, target));
    if (next === safePage) return;
    setPage(next);
    // Scroll the grid back into view. Previously this only set the page number,
    // so clicking Next from the bottom pager left you parked at the bottom —
    // you'd land on the LAST row of the new page and never see the top of it.
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  // Grid columns per breakpoint.
  //
  // Ladder matches the tiket breakpoints defined in passport-type-grid.css:
  //   base <480  2 cols  — see the note below
  //   sm   480+  2 cols
  //   md   640+  3 cols  (still mobile, but wide enough)
  //   lg   840+  the user's chosen density starts applying — this is desktop
  //   xl/2xl/3xl/4xl step up to the full requested count
  //
  // BASE WAS 1 COLUMN UNTIL 1.0.51. The reason given was that a 2-up grid at
  // 360px leaves ~160px cards, where the filename, URL field and tags stop
  // fitting legibly. That was true, but the cause was not the column count — it
  // was that AssetCard sized its own internals off `gridColumns`, a DESKTOP
  // density setting, so a phone got a card built for a 300px slot. AssetCard now
  // compacts at the base breakpoint on its own, which removes the constraint that
  // made 1 column necessary. Cards at 360px are tight, but readable and complete.
  //
  // The 3xl/4xl steps were previously referenced but never defined as
  // breakpoints, so settings 7-10 compiled to nothing and silently capped out.
  const getGridClasses = () => {
    const baseClasses = "grid gap-3 lg:gap-4";
    const columnClasses = {
      // Column counts are tuned against the CONTENT width, not the viewport:
      // at >=840px the 256px sidebar appears, so the first desktop step has to
      // stay conservative. 840px minus sidebar minus 2x28px margin leaves only
      // ~528px, where 4 columns would give 123px cards — narrower than mobile.
      4:  "grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
      5:  "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
      6:  "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6",
      7:  "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7",
      8:  "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 4xl:grid-cols-8",
      9:  "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-9",
      10: "grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-9 4xl:grid-cols-10"
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
          <h3 className="mb-1">Getting your assets ready…</h3>
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
        <p className="text-sm text-muted-foreground">Done! Showing your assets…</p>
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
            activeTags={activeTags}
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
    // The mobile pager is fixed to the viewport, so it contributes no height to
    // the flow. Without this reserved space the final row of cards sits behind
    // it. Only applies when the pager actually renders (>1 page) and only below
    // lg, where the pager exists at all.
    <div
      className={`space-y-4 ${
        totalAssetPages > 1
          ? "pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-0"
          : ""
      }`}
    >
      {/* Scroll target for goToAssetPage(). scroll-mt clears the sticky header
          so the first row isn't hidden underneath it after a page change. */}
      <div ref={gridTopRef} className="scroll-mt-44 lg:scroll-mt-40" />

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
            activeTags={activeTags}
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
        <>
          {/* Full pager, desktop only. Sits at the natural end of the page and
              holds the power controls (First/Last, jump-to-page). Not sticky —
              the sticky header already carries a compact pager on desktop, so a
              bottom bar would be a third copy eating permanent height. */}
          <div className="hidden flex-wrap items-center justify-between gap-3 border-t pt-2 lg:flex">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => goToAssetPage(1)} disabled={safePage <= 1} title="First page">
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => goToAssetPage(safePage - 1)} disabled={safePage <= 1}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
            </div>

            <span className="text-sm text-muted-foreground">
              Page {safePage} of {totalAssetPages} ({filteredAssets.length} assets)
            </span>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => goToAssetPage(safePage + 1)} disabled={safePage >= totalAssetPages}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => goToAssetPage(totalAssetPages)} disabled={safePage >= totalAssetPages} title="Last page">
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
                Go
              </Button>
            </div>
          </div>

          {/* Fixed pager, mobile only.
              Mobile is where deep scrolling hurts most AND where the header has
              no room for page controls, so it earns its ~52px here. Desktop
              gets the header pager instead and pays nothing.

              FIXED, not sticky. `sticky bottom-0` on an element sitting at the
              end of the document flow only begins sticking once the user has
              scrolled far enough for it to enter the viewport — which meant on
              load, or on any viewport tall enough to show the whole grid, the
              pager simply wasn't there. Fixed positioning makes it present
              regardless of scroll position or device height.

              The trade-off is that it no longer occupies space in the flow, so
              the wrapper above reserves the equivalent height — otherwise the
              last row of cards sits underneath it.

              Portalled to <body> for the same reason the zoom modal and detail
              panel are: any ancestor with transform/filter/backdrop-filter would
              become the containing block and `bottom-0` would resolve against
              that box instead of the viewport. It unmounts with this component,
              so it can't leak into other views. */}
          {createPortal(
          <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 border-t bg-background/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
            <Button variant="outline" size="sm" onClick={() => goToAssetPage(safePage - 1)} disabled={safePage <= 1} className="shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex min-w-0 items-center gap-1.5">
              <Input
                type="number"
                min={1}
                max={totalAssetPages}
                placeholder={String(safePage)}
                value={jumpToPageInput}
                onChange={(e) => setJumpToPageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJumpToAssetPage()}
                className="h-8 w-14 text-center"
              />
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                / {totalAssetPages}
              </span>
            </div>

            <Button variant="outline" size="sm" onClick={() => goToAssetPage(safePage + 1)} disabled={safePage >= totalAssetPages} className="shrink-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>,
          document.body
          )}
        </>
      )}
    </div>
  );
}