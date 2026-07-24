import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Plus, FolderOpen, Search } from "lucide-react";
import { type Asset } from "../utils/supabaseApi";
import { type Project } from "./ProjectManager";
import { toast } from "sonner@2.0.3";

interface AssetProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  projects: Project[];
  onUpdateProjects: (projects: Project[]) => void;
}

export function AssetProjectModal({ 
  isOpen, 
  onClose, 
  asset, 
  projects, 
  onUpdateProjects 
}: AssetProjectModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [justCreatedProjectId, setJustCreatedProjectId] = useState<string | null>(null);

  // Initialize selected projects when modal opens
  useEffect(() => {
    if (isOpen) {
      const assetProjectIds = projects
        .filter(project => project.asset_ids.includes(asset.nama_file))
        .map(project => project.id);
      setSelectedProjectIds(assetProjectIds);
      setSearchQuery("");
      setIsCreatingNew(false);
      setNewProjectName("");
      setJustCreatedProjectId(null);
    }
  }, [isOpen, asset, projects]);

  const filteredProjects = projects
    .filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Show just created project first
      if (justCreatedProjectId === a.id) return -1;
      if (justCreatedProjectId === b.id) return 1;
      // Then sort by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjectIds(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleCreateNewProject = () => {
    if (!newProjectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    const newProject: Project = {
      id: `project_${Date.now()}`,
      name: newProjectName.trim(),
      description: "",
      created_at: new Date().toISOString(),
      asset_ids: [asset.nama_file], // Add current asset to new project
      color: ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#84CC16", "#F97316"][projects.length % 8]
    };

    const updatedProjects = [...projects, newProject];
    onUpdateProjects(updatedProjects);
    
    // Auto-select the new project
    setSelectedProjectIds(prev => [...prev, newProject.id]);
    
    // Mark this project as just created for visual feedback
    setJustCreatedProjectId(newProject.id);
    
    // Reset form
    setIsCreatingNew(false);
    setNewProjectName("");
    
    toast.success("Project created successfully!", {
      description: `"${newProject.name}" created and asset added automatically.`
    });

    // Auto save after creating new project without closing modal
    setTimeout(() => {
      handleSave(false);
      // Clear the just created indicator after a delay
      setTimeout(() => setJustCreatedProjectId(null), 2000);
    }, 300);
  };

  const handleSave = (autoClose = true) => {
    const updatedProjects = projects.map(project => {
      const shouldIncludeAsset = selectedProjectIds.includes(project.id);
      const currentlyIncludes = project.asset_ids.includes(asset.nama_file);

      if (shouldIncludeAsset && !currentlyIncludes) {
        // Add asset to project
        return { ...project, asset_ids: [...project.asset_ids, asset.nama_file] };
      } else if (!shouldIncludeAsset && currentlyIncludes) {
        // Remove asset from project
        return { ...project, asset_ids: project.asset_ids.filter(id => id !== asset.nama_file) };
      }

      return project;
    });

    onUpdateProjects(updatedProjects);
    
    const addedTo = selectedProjectIds.length;
    const projectNames = updatedProjects
      .filter(p => selectedProjectIds.includes(p.id))
      .map(p => p.name)
      .join(", ");

    // Only show save toast if not called from create new project
    if (autoClose) {
      if (addedTo === 0) {
        toast.success("Asset removed from all projects");
      } else {
        toast.success(`Asset organized into ${addedTo} project${addedTo === 1 ? '' : 's'}`, {
          description: addedTo <= 3 ? `Added to: ${projectNames}` : `Added to ${addedTo} projects`
        });
      }
    }

    if (autoClose) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Organize Asset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Asset Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded border flex items-center justify-center overflow-hidden">
                <img 
                  src={asset.url_lightroom} 
                  alt={asset.asset_name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{asset.asset_name}</p>
                <p className="text-sm text-muted-foreground">{asset.type}</p>
              </div>
            </div>
          </div>

          {/* Search Projects */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Projects List */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredProjects.length === 0 && !isCreatingNew ? (
              <div className="text-center py-8">
                <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No projects found" : "No projects created yet"}
                </p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-all ${
                    justCreatedProjectId === project.id 
                      ? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
                      : ''
                  }`}
                  onClick={() => handleProjectToggle(project.id)}
                >
                  <Checkbox
                    checked={selectedProjectIds.includes(project.id)}
                    onChange={() => handleProjectToggle(project.id)}
                  />
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    {project.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {project.asset_ids.length}
                  </Badge>
                </div>
              ))
            )}
          </div>

          <Separator />

          {/* Create New Project */}
          {isCreatingNew ? (
            <div className="space-y-3">
              <Input
                placeholder="New project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNewProject();
                  if (e.key === 'Escape') setIsCreatingNew(false);
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingNew(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateNewProject}
                  className="flex-1"
                  style={{
                    background: 'linear-gradient(to right, #5BAAFF, #0062F6)',
                    color: 'white'
                  }}
                >
                  Create
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsCreatingNew(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Project
            </Button>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => handleSave(true)}
              className="flex-1"
              style={{
                background: 'linear-gradient(to right, #5BAAFF, #0062F6)',
                color: 'white'
              }}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}