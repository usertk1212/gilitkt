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
import { X } from "./icons";
import { type Asset } from "../utils/appwriteApi";
import { type Project } from "./ProjectManager";
import { toast } from "sonner";

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  projects: Project[];
  onUpdateProjects: (projects: Project[]) => void;
}

export function CreateProjectDialog({
  isOpen,
  onClose,
  asset,
  projects,
  onUpdateProjects,
}: CreateProjectDialogProps) {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleClose = () => {
    setProjectName("");
    setProjectDescription("");
    setIsCreating(false);
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
        color: "var(--pp-brand-blue)", // Default blue color
        asset_ids: [asset.nama_file],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedProjects = [...projects, newProject];
      onUpdateProjects(updatedProjects);

      toast.success("Project created!", {
        description: `"${newProject.name}" has been created and "${asset.asset_name}" has been added to it.`,
      });

      handleClose();
    } catch (error) {
      toast.error("Failed to create project");
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Create New Project</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>
        
        <div 
          className="space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-muted-foreground">
            Create a new project to organize your assets. You can add assets to projects later.
          </p>
          
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
        </div>
        
        <div 
          className="flex justify-end gap-3 mt-6"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleCreateProject();
            }}
            disabled={!projectName.trim() || isCreating}
            className="bg-primary hover:opacity-90 text-white"
          >
            {isCreating ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}