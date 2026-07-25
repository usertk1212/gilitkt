import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Plus, Folder, Calendar, Palette, Sparkles, Layers, MoreVertical, Edit2, Download, FileText, Trash2 } from "./icons";
import { toast } from "sonner";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { type Asset } from "../utils/appwriteApi";

export interface Project {
  id: string;
  name: string;
  description?: string;
  asset_ids: string[];
  created_at: string;
  updated_at: string;
}

interface ProjectManagerProps {
  assets: Asset[];
  onSelectProject: (project: Project | null) => void;
  selectedProject?: Project | null;
  onExportProject: (project: Project) => void;
  projects: Project[];
  onUpdateProjects: (projects: Project[]) => void;
}

export function ProjectManager({ 
  assets, 
  onSelectProject, 
  selectedProject, 
  onExportProject, 
  projects, 
  onUpdateProjects 
}: ProjectManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [renameProjectName, setRenameProjectName] = useState("");
  const [renameProjectDescription, setRenameProjectDescription] = useState("");

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined,
      asset_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updatedProjects = [...projects, newProject];
    onUpdateProjects(updatedProjects);

    setNewProjectName("");
    setNewProjectDescription("");
    setShowCreateModal(false);

    toast.success("Project created successfully!", {
      description: `"${newProject.name}" is ready for organizing assets.`
    });
  };

  const handleRenameProject = () => {
    if (!projectToRename || !renameProjectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    const updatedProject = {
      ...projectToRename,
      name: renameProjectName.trim(),
      description: renameProjectDescription.trim() || undefined,
      updated_at: new Date().toISOString()
    };

    const updatedProjects = projects.map(p => 
      p.id === projectToRename.id ? updatedProject : p
    );

    onUpdateProjects(updatedProjects);

    setShowRenameModal(false);
    setProjectToRename(null);
    setRenameProjectName("");
    setRenameProjectDescription("");

    toast.success("Project updated successfully!", {
      description: `"${updatedProject.name}" has been updated.`
    });
  };

  const handleDeleteProject = () => {
    if (!projectToDelete) return;

    const updatedProjects = projects.filter(p => p.id !== projectToDelete.id);
    onUpdateProjects(updatedProjects);

    // If the deleted project was selected, clear selection
    if (selectedProject?.id === projectToDelete.id) {
      onSelectProject(null);
    }

    setShowDeleteDialog(false);
    setProjectToDelete(null);

    toast.success("Project deleted", {
      description: `"${projectToDelete.name}" has been removed permanently.`
    });
  };

  const handleExportCSV = (project: Project) => {
    const projectAssets = assets.filter(asset => project.asset_ids.includes(asset.nama_file));
    
    if (projectAssets.length === 0) {
      toast.error("No assets to export", {
        description: "This project doesn't contain any assets."
      });
      return;
    }

    // Create CSV content
    const headers = ["asset_library_name", "url_lightroom", "type", "format"];
    const csvContent = [
      headers.join(","),
      ...projectAssets.map(asset => [
        `"${asset.asset_name || asset.nama_file}"`,
        `"${asset.url_lightroom}"`,
        `"${asset.type}"`,
        `"${asset.format || 'Unknown'}"`
      ].join(","))
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_assets.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("CSV exported successfully!", {
      description: `Downloaded "${project.name}" with ${projectAssets.length} assets.`
    });
  };

  const handleExportTXT = (project: Project) => {
    const projectAssets = assets.filter(asset => project.asset_ids.includes(asset.nama_file));
    
    if (projectAssets.length === 0) {
      toast.error("No assets to export", {
        description: "This project doesn't contain any assets."
      });
      return;
    }

    // Create TXT content
    const txtContent = [
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : "",
      `Total Assets: ${projectAssets.length}`,
      `Created: ${new Date(project.created_at).toLocaleDateString()}`,
      "",
      "Assets:",
      "--------",
      ...projectAssets.map((asset, index) => 
        `${index + 1}. ${asset.asset_name || asset.nama_file}\n   URL: ${asset.url_lightroom}\n   Type: ${asset.type}\n`
      )
    ].filter(Boolean).join("\n");

    // Download TXT
    const blob = new Blob([txtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_assets.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("TXT exported successfully!", {
      description: `Downloaded "${project.name}" with ${projectAssets.length} assets.`
    });
  };

  const openRenameModal = (project: Project) => {
    setProjectToRename(project);
    setRenameProjectName(project.name);
    setRenameProjectDescription(project.description || "");
    setShowRenameModal(true);
  };

  const openDeleteDialog = (project: Project) => {
    setProjectToDelete(project);
    setShowDeleteDialog(true);
  };

  // Get asset type counts for a project
  const getProjectAssetCounts = (project: Project) => {
    const projectAssets = assets.filter(asset => project.asset_ids.includes(asset.nama_file));
    const counts = {
      Spot: 0,
      Micro: 0,
      Icon: 0,
      Other: 0
    };

    projectAssets.forEach(asset => {
      if (asset.type === "Spot") counts.Spot++;
      else if (asset.type === "Micro") counts.Micro++;
      else if (asset.type === "Icon") counts.Icon++;
      else counts.Other++;
    });

    return counts;
  };

  // Get preview images for a project (first 3 assets)
  const getProjectPreviewImages = (project: Project) => {
    const projectAssets = assets.filter(asset => project.asset_ids.includes(asset.nama_file));
    return projectAssets.slice(0, 3);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Create collections to organize your assets by project, theme, or any custom criteria
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          style={{
            background: 'var(--pp-grad-brand)',
            color: 'white'
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Folder className="w-12 h-12 mx-auto mb-4" />
          </div>
          <h3 className="mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first project to start organizing assets
          </p>
          <Button 
            onClick={() => setShowCreateModal(true)}
            style={{
              background: 'var(--pp-grad-brand)',
              color: 'white'
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project) => {
            const assetCounts = getProjectAssetCounts(project);
            const previewImages = getProjectPreviewImages(project);
            const totalAssets = project.asset_ids.length;

            return (
              <Card 
                key={project.id} 
                className="group hover:shadow-lg transition-all cursor-pointer relative"
                onClick={() => onSelectProject(project)}
              >
                {/* Kebab Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-3 right-3 z-10 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        openRenameModal(project);
                      }}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportCSV(project);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportTXT(project);
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Export to TXT
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(project);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <CardContent className="p-0">
                  {/* Preview Images */}
                  <div className="aspect-[4/3] bg-gray-100 rounded-t-lg overflow-hidden relative">
                    {previewImages.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1 h-full p-2">
                        {previewImages.map((asset, index) => (
                          <div key={asset.id} className="bg-white rounded overflow-hidden">
                            <ImageWithFallback
                              src={asset.url_lightroom || "/placeholder-image.jpg"}
                              alt={asset.nama_file}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {/* Fill remaining slots with placeholders */}
                        {Array.from({ length: 3 - previewImages.length }).map((_, index) => (
                          <div key={index} className="bg-gray-200 rounded flex items-center justify-center">
                            <Folder className="w-6 h-6 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <Folder className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-muted-foreground">Empty project</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Asset count overlay */}
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="bg-black/70 text-white">
                        {totalAssets} assets
                      </Badge>
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="p-4">
                    <h3 className="font-medium mb-1 truncate" title={project.name}>
                      {project.name}
                    </h3>
                    
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Asset Type Breakdown */}
                    {totalAssets > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        {assetCounts.Spot > 0 && (
                          <div className="flex items-center gap-1">
                            <Palette className="w-3 h-3 text-purple-500" />
                            <span className="text-xs text-muted-foreground">{assetCounts.Spot}</span>
                          </div>
                        )}
                        {assetCounts.Micro > 0 && (
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[var(--pp-icon-active)]" />
                            <span className="text-xs text-muted-foreground">{assetCounts.Micro}</span>
                          </div>
                        )}
                        {assetCounts.Icon > 0 && (
                          <div className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-muted-foreground">{assetCounts.Icon}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Created date */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Created {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your assets. You can add assets to projects later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Describe what this project is for..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateModal(false);
                setNewProjectName("");
                setNewProjectDescription("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
              style={{
                background: 'var(--pp-grad-brand)',
                color: 'white'
              }}
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Project Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Update the project name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rename-name">Project Name</Label>
              <Input
                id="rename-name"
                value={renameProjectName}
                onChange={(e) => setRenameProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rename-description">Description (Optional)</Label>
              <Textarea
                id="rename-description"
                value={renameProjectDescription}
                onChange={(e) => setRenameProjectDescription(e.target.value)}
                placeholder="Describe what this project is for..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRenameModal(false);
                setProjectToRename(null);
                setRenameProjectName("");
                setRenameProjectDescription("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRenameProject}
              disabled={!renameProjectName.trim()}
              style={{
                background: 'var(--pp-grad-brand)',
                color: 'white'
              }}
            >
              Update Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
              The assets in this project will not be deleted, only the project organization will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}