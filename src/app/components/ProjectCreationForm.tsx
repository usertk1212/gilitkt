import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { X, Palette } from "lucide-react";
import { PROJECT_COLORS } from "./constants/projectConstants";

interface ProjectCreationFormProps {
  newProjectName: string;
  setNewProjectName: (name: string) => void;
  newProjectColor: string;
  setNewProjectColor: (color: string) => void;
  onCreateProject: () => void;
  onCancel: () => void;
}

export function ProjectCreationForm({
  newProjectName,
  setNewProjectName,
  newProjectColor,
  setNewProjectColor,
  onCreateProject,
  onCancel
}: ProjectCreationFormProps) {
  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Create Project</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }}
          className="h-5 w-5 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      <Input
        placeholder="Project name..."
        value={newProjectName}
        onChange={(e) => setNewProjectName(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="h-7 text-xs"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onCreateProject();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
      />
      
      <div className="flex items-center gap-1.5">
        <Palette className="h-3 w-3 text-muted-foreground" />
        <div className="flex gap-1">
          {PROJECT_COLORS.map((color) => (
            <button
              key={color}
              className={`w-4 h-4 rounded-full border-2 ${
                newProjectColor === color ? 'border-gray-400' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              onClick={(e) => {
                e.stopPropagation();
                setNewProjectColor(color);
              }}
            />
          ))}
        </div>
      </div>
      
      <div className="flex gap-1">
        <Button
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCreateProject();
          }}
          disabled={!newProjectName.trim()}
          className="h-6 text-xs px-2 flex-1"
        >
          Create
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }}
          className="h-6 text-xs px-2"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}