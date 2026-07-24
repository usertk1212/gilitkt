import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Pin, PinOff, FolderPlus } from "lucide-react";
import { type Asset } from "../utils/supabaseApi";
import { type Project } from "./ProjectManager";
import { toast } from "sonner@2.0.3";

interface ManageProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  projects: Project[];
  onUpdateProjects: (projects: Project[]) => void;
}

export function ManageProjectDialog({
  isOpen,
  onClose,
  asset,
  projects,
  onUpdateProjects,
}: ManageProjectDialogProps) {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Get projects that contain this asset
  const currentProjects = projects.filter(project => 
    project.asset_ids.includes(asset.nama_file)
  );

  const handleClose = () => {
    setProjectName("");
    setProjectDescription("");
    setIsCreating(false);
    setShowCreateForm(false);
    onClose();
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsCreating(true);

    try {
      const newProject: Project = {
        id: `project_${Date.now()}`,
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        color: "#3b82f6", // Default blue color
        asset_ids: [asset.nama_file],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedProjects = [...projects, newProject];
      onUpdateProjects(updatedProjects);

      toast.success("Project created!", {
        description: `"${newProject.name}" has been created and "${asset.asset_name}" has been added to it.`,
      });

      setProjectName("");
      setProjectDescription("");
      setShowCreateForm(false);
    } catch (error) {
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUnpinFromProject = (project: Project) => {
    const updatedProject = {
      ...project,
      asset_ids: project.asset_ids.filter(id => id !== asset.nama_file),
      updated_at: new Date().toISOString(),
    };

    const updatedProjects = projects.map(p => 
      p.id === project.id ? updatedProject : p
    );

    onUpdateProjects(updatedProjects);
    
    toast.success("Asset unpinned!", {
      description: `"${asset.asset_name}" has been removed from "${project.name}".`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Manage Projects</DialogTitle>
        </DialogHeader>
        
        <div 
          className="space-y-6"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-muted-foreground">
            Manage project assignments for "{asset.asset_name}".
          </p>

          {/* Current Projects Section */}
          {currentProjects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-blue-500" />
                <h3 className="font-medium">Current Projects</h3>
                <Badge variant="secondary" className="text-xs">
                  {currentProjects.length}
                </Badge>
              </div>
              
              <div className="space-y-2">
                {currentProjects.map((project) => (
                  <div 
                    key={project.id}
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color || "#3b82f6" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {project.name}
                        </p>
                        {project.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpinFromProject(project);
                      }}
                      className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      title={`Remove from "${project.name}"`}
                    >
                      <PinOff className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Separator if there are current projects */}
          {currentProjects.length > 0 && <Separator />}

          {/* Create New Project Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-green-500" />
              <h3 className="font-medium">Create New Project</h3>
            </div>

            {!showCreateForm ? (
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateForm(true);
                }}
                className="w-full justify-start"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Create New Project
              </Button>
            ) : (
              <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    placeholder="Enter project name..."
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    className="w-full"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleCreateProject();
                      }
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project-description">Description (Optional)</Label>
                  <Textarea
                    id="project-description"
                    placeholder="Describe what this project is for..."
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    className="w-full resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateForm(false);
                      setProjectName("");
                      setProjectDescription("");
                    }}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateProject();
                    }}
                    disabled={!projectName.trim() || isCreating}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}