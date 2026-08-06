import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Asset, getAllAssets, updateAssetById, deleteAsset } from '../utils/appwriteApi';
import { extractTags } from './helpers/assetHelpers';
import { searchAssetList } from '../utils/search';
import { getAssetTypeLabel } from './constants/projectConstants';
import { toast } from "sonner";
import { InlineRename } from './InlineRename';
import { AlertCircle, CheckCircle, Edit, Filter, Grid3X3, List, Link, Loader2, MoreHorizontal, Search, Trash2 } from "./icons";

interface ManageAssetProps {
  onNavigateBack: () => void;
}

interface EditAssetForm {
  asset_name: string;
  type: string;
  url_lightroom: string;
}

export function ManageAsset({ onNavigateBack }: ManageAssetProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  
  // Delete states
  const [deleteAssetData, setDeleteAssetData] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Edit states
  const [editAssetData, setEditAssetData] = useState<Asset | null>(null);
  const [editForm, setEditForm] = useState<EditAssetForm>({
    asset_name: '',
    type: '',
    url_lightroom: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const assetTypes = [
    { value: 'Spot', label: 'Spot Illustration' },
    { value: 'Micro', label: 'Micro Illustration' },
    { value: 'Icon', label: 'Icons' },
    { value: 'Supergraphic', label: 'Supergraphic' },
    { value: 'Other', label: 'Others' },
    { value: 'General', label: 'General' }
  ];

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    filterAssets();
  }, [assets, searchQuery, selectedType]);

  const loadAssets = async () => {
    try {
      setIsLoading(true);
      const response = await getAllAssets();
      
      if (response.success && response.data) {
        setAssets(response.data);
      } else {
        console.error('Failed to load assets:', response.error);
        toast.error('Failed to load assets', {
          description: response.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
      toast.error('Failed to load assets', {
        description: 'Check your connection and try again'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterAssets = () => {
    let filtered = [...assets];

    // Filter by search query.
    //
    // Uses the same engine as the dashboard rather than a second hand-rolled
    // matcher. This screen had its own copy of the old whole-query substring test,
    // so "train blue" failed here too — and a divergent second implementation is
    // how the two screens would have drifted apart again.
    if (searchQuery) {
      filtered = searchAssetList(filtered, searchQuery);
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(asset => 
        asset.type?.toLowerCase() === selectedType.toLowerCase()
      );
    }

    setFilteredAssets(filtered);
  };

  // Delete Asset Handler
  const handleDeleteAsset = async (asset: Asset) => {
    setIsDeleting(true);
    
    try {
      console.log('🗑️ Deleting asset:', asset.nama_file);
      const response = await deleteAsset(asset.nama_file);
      
      if (response.success) {
        // Remove from local state
        setAssets(prev => prev.filter(a => a.nama_file !== asset.nama_file));
        
        toast.success('Asset deleted successfully', {
          description: `"${asset.asset_name}" has been removed from the database`
        });
        
        setDeleteAssetData(null);
      } else {
        throw new Error(response.error || 'Failed to delete asset');
      }
    } catch (error) {
      console.error('🚨 Failed to delete asset:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast.error('Failed to delete asset', {
        description: errorMessage
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit Asset Handlers
  const handleEditAsset = (asset: Asset) => {
    setEditAssetData(asset);
    setEditForm({
      asset_name: asset.asset_name,
      type: asset.type,
      url_lightroom: asset.url_lightroom
    });
    setEditErrors({});
  };

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editForm.asset_name.trim()) {
      errors.asset_name = 'Asset name is required';
    }

    if (!editForm.type.trim()) {
      errors.type = 'Asset type is required';
    }

    if (!editForm.url_lightroom.trim()) {
      errors.url_lightroom = 'URL is required';
    } else {
      try {
        new URL(editForm.url_lightroom);
      } catch {
        errors.url_lightroom = 'Please enter a valid URL';
      }
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateAsset = async () => {
    if (!editAssetData || !validateEditForm()) {
      return;
    }

    setIsEditing(true);

    try {
      console.log('📝 Updating asset:', editAssetData.nama_file);
      // By id, not by filename: the filename variant has to look the document up
      // first, which is a database read — so a small edit cost a read, and failed
      // completely whenever the monthly read quota was exhausted. The id is
      // already on the asset we're editing.
      const response = await updateAssetById(editAssetData.id, {
        asset_name: editForm.asset_name.trim(),
        type: editForm.type,
        url_lightroom: editForm.url_lightroom.trim()
      });

      if (response.success && response.data) {
        // Update local state
        setAssets(prev => prev.map(asset => 
          asset.nama_file === editAssetData.nama_file 
            ? { ...asset, ...response.data }
            : asset
        ));

        toast.success('Asset updated successfully', {
          description: `"${editForm.asset_name}" has been updated`
        });

        setEditAssetData(null);
        setEditForm({ asset_name: '', type: '', url_lightroom: '' });
      } else {
        throw new Error(response.error || 'Failed to update asset');
      }
    } catch (error) {
      console.error('🚨 Failed to update asset:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast.error('Failed to update asset', {
        description: errorMessage
      });
    } finally {
      setIsEditing(false);
    }
  };

  /**
   * Apply a rename to the in-memory list.
   *
   * Patched locally rather than re-fetching: updateAssetById has already
   * republished the snapshot, so a refetch would download the whole library again
   * to learn one string we already have.
   */
  const handleRenamed = (updated: Asset) => {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  /**
   * Open the asset in Lightroom.
   *
   * This was labelled "Download" while its entire body was `window.open` — it
   * never downloaded anything, in any browser, ever. The function is useful, so
   * only the name was wrong: renamed here and relabelled in both menus.
   *
   * A real download is not possible from the client while the asset CDN withholds
   * `Access-Control-Allow-Origin`; see the note in AssetCard.
   */
  const handleOpenInLightroom = (asset: Asset) => {
    window.open(asset.url_lightroom, '_blank', 'noopener,noreferrer');
  };

  const AssetCard = ({ asset }: { asset: Asset }) => {
    const tags = extractTags(asset);

    if (viewMode === 'list') {
      return (
        <Card className="bg-card hover:bg-accent/50 transition-all duration-200 shadow-sm border hover:shadow-md">
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
                    <InlineRename asset={asset} onRenamed={handleRenamed} className="w-full" />
                    <p className="text-sm mt-1 text-muted-foreground overflow-x-auto whitespace-nowrap scrollbar-thin">
                      {asset.nama_file}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {getAssetTypeLabel(asset.type)}
                      </Badge>
                      {tags.slice(0, 3).map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{tags.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-2">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditAsset(asset)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Asset
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenInLightroom(asset)}>
                        <Link className="w-4 h-4 mr-2" />
                        Open in Lightroom
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setDeleteAssetData(asset)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Asset
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Grid view
    return (
      <Card className="bg-card rounded-lg shadow-sm group cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden border">
        <CardContent className="p-0">
          <div className="relative overflow-hidden aspect-[4/3] bg-muted">
            {asset.type === 'Micro' ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <div className="aspect-square w-full max-w-[75%] flex items-center justify-center">
                  <ImageWithFallback
                    src={asset.url_lightroom}
                    alt={asset.asset_name}
                    className="w-full h-full object-contain"
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
                    className="w-full h-full object-contain"
                    style={{ minHeight: '100%', minWidth: '100%', display: 'block' }}
                  />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4">
                <ImageWithFallback
                  src={asset.url_lightroom}
                  alt={asset.asset_name}
                  className="w-full h-full object-contain"
                  style={{ minHeight: '100%', minWidth: '100%', display: 'block' }}
                />
              </div>
            )}

            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs">
              {getAssetTypeLabel(asset.type)}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* Same hover-on-touch trap as the other two kebabs: this is the
                    only entry point to Edit and Delete for an asset, so on a
                    phone it has to be visible without a pointer. */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 p-1.5 w-7 h-7 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditAsset(asset)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Asset
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenInLightroom(asset)}>
                  <Link className="w-4 h-4 mr-2" />
                  Open in Lightroom
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setDeleteAssetData(asset)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Asset
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="p-4">
            {/* Shows the stored value, not a title-cased version of it — otherwise
                clicking to rename would replace what you see with something
                different, and every rename would silently rewrite the casing. */}
            <InlineRename asset={asset} onRenamed={handleRenamed} className="mb-1 w-full" />
            <p className="text-sm text-muted-foreground mb-3 truncate">
              {asset.nama_file}
            </p>
            
            {tags.length > 0 && (
              <div className="overflow-x-auto scrollbar-thin">
                <div className="flex gap-1 min-w-max">
                  {tags.slice(0, 2).map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {tags.length > 2 && (
                    <Badge
                      variant="outline"
                      className="text-xs flex-shrink-0"
                    >
                      +{tags.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading assets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Filters and Controls */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Type Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    {selectedType === 'all' ? 'All Types' : selectedType}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSelectedType('all')}>
                    All Types
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedType('spot')}>
                    Spot Illus
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedType('micro')}>
                    Micro Illus
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedType('icon')}>
                    Icons
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedType('supergraphic')}>
                    Supergraphic
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedType('other')}>
                    Others
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="text-sm text-muted-foreground ml-auto">
                {filteredAssets.length} of {assets.length} assets
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Assets Grid/List */}
        {filteredAssets.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-muted-foreground mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No assets found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedType !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'No assets have been uploaded yet'
              }
            </p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' 
              : 'space-y-4'
          }>
            {filteredAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}

        {/* Edit Asset Dialog */}
        <Dialog open={!!editAssetData} onOpenChange={() => setEditAssetData(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit Asset
              </DialogTitle>
              <DialogDescription>
                Update asset information. Changes will be saved to the database.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Asset Name */}
              <div className="space-y-2">
                <Label htmlFor="asset-name">Asset Name</Label>
                <Input
                  id="asset-name"
                  value={editForm.asset_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, asset_name: e.target.value }))}
                  placeholder="Enter asset name"
                  className={editErrors.asset_name ? 'border-destructive' : ''}
                />
                {editErrors.asset_name && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {editErrors.asset_name}
                  </p>
                )}
              </div>

              {/* Asset Type */}
              <div className="space-y-2">
                <Label htmlFor="asset-type">Asset Type</Label>
                <Select 
                  value={editForm.type} 
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className={editErrors.type ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editErrors.type && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {editErrors.type}
                  </p>
                )}
              </div>

              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="asset-url">Image URL</Label>
                <Input
                  id="asset-url"
                  value={editForm.url_lightroom}
                  onChange={(e) => setEditForm(prev => ({ ...prev, url_lightroom: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  className={editErrors.url_lightroom ? 'border-destructive' : ''}
                />
                {editErrors.url_lightroom && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {editErrors.url_lightroom}
                  </p>
                )}
              </div>

              {/* Read-only filename */}
              <div className="space-y-2">
                <Label htmlFor="filename">Filename (read-only)</Label>
                <Input
                  id="filename"
                  value={editAssetData?.nama_file || ''}
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Filename cannot be changed as it's used as the unique identifier
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditAssetData(null)}
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateAsset}
                disabled={isEditing}
                className="min-w-24"
              >
                {isEditing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteAssetData} onOpenChange={() => setDeleteAssetData(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-4 h-4" />
                Delete Asset
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>"{deleteAssetData?.asset_name}"</strong>?
                <br /><br />
                <span className="text-sm text-muted-foreground">
                  Filename: {deleteAssetData?.nama_file}
                </span>
                <br /><br />
                This action cannot be undone and will permanently remove the asset from the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAssetData && handleDeleteAsset(deleteAssetData)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-w-24"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Asset
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}