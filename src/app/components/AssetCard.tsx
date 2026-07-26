import { useState, memo } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { type Asset } from "../utils/appwriteApi";
import { type Project } from "./ProjectManager";
import { toast } from "sonner";
import { copyWithFeedback } from "../utils/clipboard";
import { ProjectDropdownContent } from "./ProjectDropdownContent";
import { ManageProjectDialog } from "./ManageProjectDialog";
import { extractTags } from "./helpers/assetHelpers";
import { getAssetTypeLabel } from "./constants/projectConstants";
import { Check, Copy, Download, Edit, Eye, FolderPlus, MoreHorizontal, Plus, Share, Trash2 } from "./icons";

interface AssetCardProps {
  asset: Asset;
  viewMode: "grid" | "list";
  isFavorite: boolean;
  isSelected?: boolean;
  onToggleFavorite: (nama_file: string) => void;
  onSelect?: (asset: Asset) => void;
  onTagClick?: (tag: string) => void;
  onAssetOrganize?: (asset: Asset) => void;
  projects?: Project[];
  onUpdateProjects?: (projects: Project[]) => void;
  onCreateNewProject?: () => void;
  isInProject?: boolean;
  currentProject?: Project;
  gridColumns?: number; // Add gridColumns prop
}

function AssetCardImpl({
  asset,
  viewMode,
  isFavorite,
  isSelected = false,
  onToggleFavorite,
  onSelect,
  onTagClick,
  onAssetOrganize,
  projects = [],
  onUpdateProjects,
  onCreateNewProject,
  isInProject = false,
  currentProject,
  gridColumns = 4, // Default to 4 columns
}: AssetCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showManageProjectDialog, setShowManageProjectDialog] = useState(false);

  // Determine card size based on grid columns
  const isSmallCard = gridColumns >= 7; // 7+ columns = small cards
  const isMediumCard = gridColumns >= 5 && gridColumns < 7; // 5-6 columns = medium cards
  const isLargeCard = gridColumns < 5; // 4 or fewer columns = large cards

  const handleCopyClick = async (text: string) => {
    await copyWithFeedback(
      text,
      () => {
        setIsCopied(true);
        toast.success("Link copied to clipboard!", {
          description: "The asset URL has been copied successfully.",
        });
        setTimeout(() => setIsCopied(false), 2000);
      },
      (errorMessage: string) => {
        if (errorMessage.includes("selected")) {
          toast.info("Please copy manually", { description: errorMessage, duration: 5000 });
        } else if (errorMessage.includes("dialog")) {
          toast.info("Copy manually", { description: errorMessage, duration: 4000 });
        } else {
          toast.error("Copy failed", { description: errorMessage, duration: 6000 });
        }
      }
    );
  };

  const handleAddToProject = (project: Project) => {
    if (!onUpdateProjects) return;

    if (project.asset_ids.includes(asset.nama_file)) {
      toast.info("Asset already in project", {
        description: `"${asset.asset_name}" is already in "${project.name}".`
      });
      return;
    }

    const updatedProjects = projects.map(p => 
      p.id === project.id 
        ? { ...p, asset_ids: [...p.asset_ids, asset.nama_file] }
        : p
    );

    onUpdateProjects(updatedProjects);
    toast.success("Asset added to project!", {
      description: `"${asset.asset_name}" has been added to "${project.name}".`
    });
  };

  const handleUnpinFromProject = () => {
    if (!currentProject || !onUpdateProjects) return;

    const updatedProject = {
      ...currentProject,
      asset_ids: currentProject.asset_ids.filter(id => id !== asset.nama_file),
      updated_at: new Date().toISOString()
    };

    const updatedProjects = projects.map(p => 
      p.id === currentProject.id ? updatedProject : p
    );

    onUpdateProjects(updatedProjects);
    toast.success("Asset unpinned", {
      description: `"${asset.asset_name}" has been removed from "${currentProject.name}".`
    });
  };

  const handleUnpinFromSpecificProject = (project: Project) => {
    if (!onUpdateProjects) return;

    const updatedProject = {
      ...project,
      asset_ids: project.asset_ids.filter(id => id !== asset.nama_file),
      updated_at: new Date().toISOString()
    };

    const updatedProjects = projects.map(p => 
      p.id === project.id ? updatedProject : p
    );

    onUpdateProjects(updatedProjects);
    setIsDropdownOpen(false); // Close dropdown after unpin
    toast.success("Asset unpinned", {
      description: `"${asset.asset_name}" has been removed from "${project.name}".`
    });
  };

  const handleOpenManageDialog = () => {
    setIsDropdownOpen(false); // Close dropdown first
    setShowManageProjectDialog(true);
  };

  const handleDropdownOpenChange = (open: boolean) => {
    setIsDropdownOpen(open);
    if (!open) {
      setProjectSearchQuery("");
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Show loading toast
      toast.info("Starting download...", {
        description: `Downloading "${asset.asset_name}"`,
      });

      // Create a link element and trigger download
      const link = document.createElement('a');
      link.href = asset.url_lightroom;
      link.download = asset.nama_file || asset.asset_name;
      link.target = '_blank';
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success toast
      toast.success("Download started!", {
        description: `"${asset.asset_name}" is being downloaded.`,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast.error("Download failed", {
        description: "Could not download the asset. Please try again.",
      });
    }
  };

  const tags = extractTags(asset);

  // No more truncation - show all tags with horizontal scroll

  const ProjectDropdown = () => (
    <DropdownMenu open={isDropdownOpen} onOpenChange={handleDropdownOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={viewMode === "grid" ? "secondary" : "ghost"}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsDropdownOpen(true);
          }}
          className={viewMode === "grid" 
            ? `absolute top-2 right-2 ${isSmallCard ? 'p-1 w-6 h-6' : 'p-1.5 w-7 h-7'} opacity-0 group-hover:opacity-100 transition-opacity`
            : "p-2"
          }
          title="Manage project assignment"
        >
          <Plus className={isSmallCard ? "w-3 h-3" : "w-4 h-4"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto" sideOffset={2}>
        <ProjectDropdownContent
          projects={projects}
          projectSearchQuery={projectSearchQuery}
          setProjectSearchQuery={setProjectSearchQuery}
          onOpenCreateDialog={handleOpenManageDialog}
          isInProject={isInProject}
          currentProject={currentProject}
          onUnpinFromProject={handleUnpinFromProject}
          onAddToProject={handleAddToProject}
          onUnpinFromSpecificProject={handleUnpinFromSpecificProject}
          asset={asset}
          setIsDropdownOpen={setIsDropdownOpen}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (viewMode === "list") {
    return (
      <Card 
        className={`bg-card hover:bg-accent/50 transition-all duration-200 cursor-pointer shadow-sm border border-border hover:shadow-md ${
          isSelected ? 'ring-2 ring-ring ring-offset-2' : ''
        }`}
        onClick={() => onSelect?.(asset)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              <ImageWithFallback
                src={asset.url_lightroom}
                alt={asset.asset_name}
                className={`w-full h-full ${
                  asset.type === 'Micro' ? 'object-contain p-3' :
                  asset.type === 'Icon' ? 'object-contain p-2' :
                  'object-contain p-2'
                }`}
                style={{ minHeight: '100%', minWidth: '100%', display: 'block' }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-lg font-medium text-foreground">
                    {asset.asset_name}
                  </h4>
                  <p className="text-sm mt-1 text-muted-foreground overflow-x-auto whitespace-nowrap scrollbar-thin">
                    {asset.nama_file}
                  </p>

                  <div className="bg-muted border border-border rounded-lg mt-3 max-w-md">
                    <div className="flex items-center px-3 py-2 gap-3">
                      <a
                        href={asset.url_lightroom}
                        className="flex-1 text-sm text-muted-foreground truncate hover:text-blue-600 transition-colors underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {asset.url_lightroom}
                      </a>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyClick(asset.url_lightroom);
                        }}
                        className="shrink-0 h-8 w-8 p-0 bg-primary hover:opacity-90 text-white rounded-md"
                        style={isCopied ? { background: 'var(--pp-bg-green-high)' } : {}}
                        title="Copy link"
                      >
                        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {tags.length > 0 && (
                    <div className="mt-3 overflow-x-auto scrollbar-thin">
                      <div className="flex items-start gap-2 min-w-max">
                        {tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full cursor-pointer hover:bg-accent transition-colors flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTagClick?.(tag);
                            }}
                            title={`Filter by "${tag}"`}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <ProjectDropdown />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-2">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssetOrganize?.(asset); }}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Add to Project
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect?.(asset);
                        }}
                      ><Eye className="w-4 h-4 mr-2" />Preview</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownload}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem><Share className="w-4 h-4 mr-2" />Share</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Manage Project Dialog */}
        <ManageProjectDialog
          isOpen={showManageProjectDialog}
          onClose={() => setShowManageProjectDialog(false)}
          asset={asset}
          projects={projects}
          onUpdateProjects={onUpdateProjects || (() => {})}
        />
      </Card>
    );
  }

  // Grid view - responsive based on card size
  return (
    <Card
      className={`bg-card rounded-2xl shadow-sm group cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden border border-border ${
        isSelected ? 'ring-2 ring-ring ring-offset-2' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect?.(asset)}
    >
      <CardContent className="p-0">
        {/* Image Container */}
        <div className="relative overflow-hidden aspect-[4/3] bg-muted">
          {asset.type === 'Micro' ? (
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="aspect-square w-full max-w-[75%] flex items-center justify-center">
                <ImageWithFallback
                  src={asset.url_lightroom}
                  alt={asset.asset_name}
                  className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                  style={{ minHeight: '100%', minWidth: '100%', display: 'block' }}
                />
              </div>
            </div>
          ) : asset.type === 'Icon' ? (
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="aspect-square w-full max-w-[60%] flex items-center justify-center">
                <ImageWithFallback
                  src={asset.url_lightroom}
                  alt={asset.asset_name}
                  className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                  style={{ minHeight: '100%', minWidth: '100%', display: 'block' }}
                />
              </div>
            </div>
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${
              isSmallCard ? 'p-2' : isMediumCard ? 'p-3' : 'p-4'
            }`}>
              <ImageWithFallback
                src={asset.url_lightroom}
                alt={asset.asset_name}
                className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                style={{ minHeight: '100%', minWidth: '100%', display: 'block' }}
              />
            </div>
          )}

          {/* Hover overlay - only show on larger cards */}
          {!isSmallCard && (
            <div className={`absolute inset-0 bg-black/40 items-center justify-center gap-2 transition-opacity duration-200 hidden lg:flex ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}>
              {/* Preview opens the detail panel, exactly like clicking the card.
                  Zoom then lives inside that panel, so there's a single path
                  (card -> detail -> zoom) instead of two competing ones. */}
              <Button
                size="sm"
                className="text-xs px-3 py-1.5 bg-white/90 text-gray-900 hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(asset);
                }}
                title="Open details"
              >
                <Eye className="w-3 h-3 mr-1" />
                {!isMediumCard && <span>Preview</span>}
              </Button>
              <Button 
                size="sm" 
                className="p-1.5 bg-white/90 text-gray-900 hover:bg-white"
                onClick={handleDownload}
                title="Download asset"
              >
                <Download className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Type badge - only show on hover and larger cards */}
          {!isSmallCard && (
            <div className={`absolute top-2 left-2 px-2 py-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
              isSmallCard ? 'text-xs' : 'text-xs'
            }`}>
              {getAssetTypeLabel(asset.type)}
            </div>
          )}

          <ProjectDropdown />
        </div>

        {/* Content - responsive padding */}
        <div className={isSmallCard ? "p-2" : isMediumCard ? "p-3" : "p-4"}>
          {/* Title - responsive font size */}
          <h4 className={`font-medium text-foreground mb-1 overflow-x-auto whitespace-nowrap scrollbar-thin ${
            isSmallCard ? 'text-sm' : 'text-base'
          }`} title={asset.asset_name}>
            {asset.asset_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h4>

          {/* Filename - responsive font size with horizontal scroll */}
          <p className={`text-muted-foreground overflow-x-auto whitespace-nowrap scrollbar-thin ${
            isSmallCard ? 'text-xs mb-2' : 'text-sm mb-3'
          }`} title={asset.nama_file}>
            {asset.nama_file}
          </p>

          {/* URL with copy button - responsive sizing */}
          <div className={`overflow-hidden bg-muted border border-border rounded-lg ${
            isSmallCard ? 'mb-2' : 'mb-3'
          }`}>
            <div className={`flex items-center gap-2 ${
              isSmallCard ? 'px-2 py-1.5' : 'px-3 py-2'
            }`}>
              {/* min-w-0 + size={1} are load-bearing.
                  A flex item defaults to min-width:auto, and for an <input>
                  that resolves to its INTRINSIC width — roughly 20 characters,
                  ~180px. So the input refused to shrink and shoved the copy
                  button outside the card at dense column counts (7-10), where
                  the whole card is only ~130px wide. */}
              <input
                type="text"
                size={1}
                value={asset.url_lightroom}
                readOnly
                className={`min-w-0 flex-1 text-muted-foreground bg-transparent border-none outline-none cursor-pointer ${
                  isSmallCard ? 'text-xs' : 'text-sm'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  (e.target as HTMLInputElement).select();
                }}
              />
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyClick(asset.url_lightroom);
                }}
                className={`shrink-0 p-0 bg-primary hover:opacity-90 text-white ${
                  isSmallCard ? 'h-6 w-6 rounded-sm' : 'h-8 w-8 rounded-md'
                }`}
                style={isCopied ? { background: 'var(--pp-bg-green-high)' } : {}}
                title="Copy link"
              >
                {isCopied ? (
                  <Check className={isSmallCard ? "h-3 w-3" : "h-4 w-4"} />
                ) : (
                  <Copy className={isSmallCard ? "h-3 w-3" : "h-4 w-4"} />
                )}
              </Button>
            </div>
          </div>

          {/* Tags - horizontal scroll, show all tags */}
          {tags.length > 0 && (
            <div className={`overflow-x-auto scrollbar-thin ${
              isSmallCard ? 'mb-1' : 'mb-2'
            }`}>
              <div className={`flex ${
                isSmallCard ? 'gap-1' : 'gap-1.5'
              } min-w-max`}>
                {tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className={`bg-muted text-muted-foreground rounded-full cursor-pointer hover:bg-accent transition-colors flex-shrink-0 ${
                      isSmallCard ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(tag);
                    }}
                    title={`Filter by "${tag}"`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Manage Project Dialog */}
      <ManageProjectDialog
        isOpen={showManageProjectDialog}
        onClose={() => setShowManageProjectDialog(false)}
        asset={asset}
        projects={projects}
        onUpdateProjects={onUpdateProjects || (() => {})}
      />


    </Card>
  );
}

// Memoized — with hundreds/thousands of cards on screen at once, this avoids
// re-rendering every single card when something unrelated elsewhere changes.
export const AssetCard = memo(AssetCardImpl);