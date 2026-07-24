import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from './ui/sidebar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { 
  Search, 
  Home,
  ChevronRight
} from 'lucide-react';
import { SharedSidebar } from './SharedSidebar';
import { AssetTableRow } from './AssetTableRow';
import { useAssetData } from './hooks/useAssetData';

interface AssetManagementProps {
  onNavigateBack: () => void;
}

export function AssetManagement({ onNavigateBack }: AssetManagementProps) {
  const {
    assets,
    assetCounts,
    loading,
    error,
    dataSource,
    isExporting,
    handleExportCSV,
    handleRefresh
  } = useAssetData();

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Assets');
  const [filteredAssets, setFilteredAssets] = useState(assets);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };

  // Filter assets based on search and category
  useEffect(() => {
    let filtered = [...assets];

    // Filter by category
    if (selectedCategory !== 'All Assets') {
      if (selectedCategory === 'Spot Illus') {
        filtered = filtered.filter(asset => asset.type === 'Spot');
      } else if (selectedCategory === 'Micro Illustration') {
        filtered = filtered.filter(asset => asset.type === 'Micro');
      } else if (selectedCategory === 'Icons') {
        filtered = filtered.filter(asset => asset.type === 'Icon');
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(asset =>
        (asset.asset_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.nama_file || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.type || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredAssets(filtered);
  }, [assets, selectedCategory, searchQuery]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background">
        <SharedSidebar 
          onNavigateBack={onNavigateBack}
          onCategoryClick={handleCategoryClick}
          assetCounts={assetCounts}
          assets={assets}
          loading={loading}
          error={error}
          dataSource={dataSource}
          isExporting={isExporting}
          handleRefresh={handleRefresh}
          handleExportCSV={handleExportCSV}
          showBackButton={true}
        />

        <SidebarInset className="flex flex-col">
          {/* Header */}
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center px-6 gap-4">
              <SidebarTrigger className="size-9 hover:bg-accent/50 rounded-lg bg-transparent text-foreground shrink-0" />
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Admin Dashboard</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Asset Management</span>
              </div>
              <div className="ml-auto flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Data Assets</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-xs text-white font-medium">AD</span>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">admin</div>
                    <div className="text-xs text-muted-foreground">Administrator</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 bg-gray-50">
            <div className="bg-white rounded-lg border shadow-sm">
              {/* Search Header */}
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Asset Management</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Badge variant="secondary" className="text-xs px-3 py-1">
                      {filteredAssets.length} assets
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-auto max-h-[calc(100vh-200px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading assets...</p>
                    </div>
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <p className="text-muted-foreground">No assets found</p>
                      {searchQuery && (
                        <p className="text-sm text-muted-foreground mt-1">Try adjusting your search</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-20">Preview</TableHead>
                        <TableHead>Asset Name</TableHead>
                        <TableHead className="w-24">Type</TableHead>
                        <TableHead>Takla Name</TableHead>
                        <TableHead className="w-32">Link</TableHead>
                        <TableHead className="w-20 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssets.map((asset) => (
                        <AssetTableRow key={asset.id} asset={asset} />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}