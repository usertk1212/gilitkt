import { Input } from "./ui/input";
import { DropdownMenuItem, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { Search, Plus, PinOff, Check } from "lucide-react";
import { Project } from "./ProjectManager";
import { Asset } from "../utils/supabaseApi";
import { highlightSearchMatch } from "./helpers/assetHelpers";

interface ProjectDropdownContentProps {
  projects: Project[];
  projectSearchQuery: string;
  setProjectSearchQuery: (query: string) => void;
  onOpenCreateDialog: () => void;
  isInProject: boolean;
  currentProject?: Project;
  onUnpinFromProject: () => void;
  onAddToProject: (project: Project) => void;
  onUnpinFromSpecificProject?: (project: Project) => void;
  asset: Asset;
  setIsDropdownOpen: (open: boolean) => void;
}

export function ProjectDropdownContent({
  projects,
  projectSearchQuery,
  setProjectSearchQuery,
  onOpenCreateDialog,
  isInProject,
  currentProject,
  onUnpinFromProject,
  onAddToProject,
  onUnpinFromSpecificProject,
  asset,
  setIsDropdownOpen
}: ProjectDropdownContentProps) {
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(projectSearchQuery.toLowerCase())
  );

  return (
    <>
      {/* Search Input */}
      {projects.length > 3 && (
        <>
          <div className="p-1.5">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="pl-7 h-7 text-xs"
              />
            </div>
          </div>
          <DropdownMenuSeparator />
        </>
      )}

      {/* Unpin option - only show when in project context */}
      {isInProject && currentProject && (
        <>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onUnpinFromProject();
            }}
            className="flex items-center text-orange-600 focus:text-orange-700 focus:bg-orange-50 py-1.5 px-2 text-xs"
          >
            <PinOff className="w-3 h-3 mr-1.5" />
            Unpin from "{currentProject.name}"
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}

      {/* Regular project options */}
      {filteredProjects.length > 0 ? (
        <>
          {filteredProjects
            .filter(project => !isInProject || project.id !== currentProject?.id) // Hide current project in dropdown
            .map((project) => {
              const isAssetInProject = project.asset_ids.includes(asset.nama_file);
              return (
                <DropdownMenuItem
                  key={project.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAssetInProject) {
                      // Unpin from project
                      onUnpinFromSpecificProject?.(project);
                    } else {
                      // Add to project
                      onAddToProject(project);
                    }
                  }}
                  className={`flex items-center py-1.5 px-2 text-xs transition-colors ${
                    isAssetInProject 
                      ? 'hover:bg-orange-50 hover:text-orange-700' 
                      : 'hover:bg-blue-50 hover:text-blue-700'
                  }`}
                  title={isAssetInProject ? `Remove from "${project.name}"` : `Add to "${project.name}"`}
                >
                  <div 
                    className="w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate">
                    {highlightSearchMatch(project.name, projectSearchQuery)}
                  </span>
                  {isAssetInProject && (
                    <Check className="w-3 h-3 ml-auto text-green-600" />
                  )}
                </DropdownMenuItem>
              );
            })}
          <DropdownMenuSeparator />
        </>
      ) : projectSearchQuery && projects.length > 0 ? (
        <>
          <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
            No projects found
          </div>
          <DropdownMenuSeparator />
        </>
      ) : null}
      
      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          onOpenCreateDialog();
        }}
        className="py-1.5 px-2 text-xs"
      >
        <Plus className="w-3 h-3 mr-1.5" />
        Manage Projects
      </DropdownMenuItem>
    </>
  );
}