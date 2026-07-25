import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Slider } from "./ui/slider";
import { X, CalendarDays, Palette, FileType, User } from "./icons";
import { loadAssets, type Asset } from "../utils/dataLoader";

export function AssetFilters() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sizeRange, setSizeRange] = useState([0, 100]);
  const [filterOptions, setFilterOptions] = useState({
    types: [] as string[],
    styles: [] as string[],
    creators: [] as string[]
  });

  // Load dynamic filter options from assets
  useEffect(() => {
    const assets = loadAssets();
    
    // Extract unique types
    const types = [...new Set(assets.map(asset => asset.type))];
    
    // Generate style options based on asset types
    const styles = ["Flat", "Line Art", "Realistic", "Abstract", "Minimalist", "Hand-drawn"];
    
    // Generate creator options (mock data since not in JSON)
    const creators = ["Design Team", "John Doe", "Jane Smith", "External Artist"];
    
    setFilterOptions({
      types,
      styles,
      creators
    });
  }, []);

  const filterCategories = [
    {
      title: "Asset Type",
      icon: FileType,
      options: filterOptions.types
    },
    {
      title: "Style",
      icon: Palette,
      options: filterOptions.styles
    },
    {
      title: "Created By",
      icon: User,
      options: filterOptions.creators
    }
  ];

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const clearFilter = (filter: string) => {
    setActiveFilters(prev => prev.filter(f => f !== filter));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSizeRange([0, 100]);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3>Filters</h3>
          {activeFilters.length > 0 && (
            <Badge variant="secondary">{activeFilters.length} active</Badge>
          )}
        </div>
        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear all
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sort By */}
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Sort By
          </label>
          <Select defaultValue="recent">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="type">By Type</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* File Size Range */}
        <div className="space-y-3">
          <label>File Size (KB)</label>
          <div className="px-2">
            <Slider
              value={sizeRange}
              onValueChange={setSizeRange}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-1">
              <span>{sizeRange[0]}KB</span>
              <span>{sizeRange[1]}KB+</span>
            </div>
          </div>
        </div>

        {/* Dynamic Filter Categories */}
        {filterCategories.map(category => (
          <div key={category.title} className="space-y-3">
            <label className="flex items-center gap-2">
              <category.icon className="w-4 h-4" />
              {category.title}
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {category.options.map(option => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${category.title}-${option}`}
                    checked={activeFilters.includes(option)}
                    onCheckedChange={() => toggleFilter(option)}
                  />
                  <label
                    htmlFor={`${category.title}-${option}`}
                    className="text-sm cursor-pointer"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            {activeFilters.map(filter => (
              <Badge key={filter} variant="secondary" className="flex items-center gap-1">
                {filter}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => clearFilter(filter)}
                />
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}