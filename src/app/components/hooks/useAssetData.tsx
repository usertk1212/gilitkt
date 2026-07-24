import { useState, useEffect } from 'react';
import { getAllAssets, initializeAssetSystem, getAssetCounts, exportAssetsToCSV, Asset } from '../../utils/supabaseApi';
import { toast } from "sonner";

export function useAssetData() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetCounts, setAssetCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('loading');
  const [isExporting, setIsExporting] = useState(false);

  // Load assets from the Appwrite database
  const loadAssets = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      console.log('🚀 Loading assets from the Appwrite database...');
      
      // Initialize system first
      await initializeAssetSystem();
      
      // Get all assets
      const response = await getAllAssets();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load assets');
      }
      
      const loadedAssets = response.data || [];
      console.log(`✅ Loaded ${loadedAssets.length} assets from ${response.source || 'database'}`);
      
      setAssets(loadedAssets);
      setDataSource(response.source || 'database');
      
      // Calculate counts
      const counts = getAssetCounts(loadedAssets);
      setAssetCounts(counts);
      
    } catch (err) {
      console.error('🚨 Error loading assets:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assets';
      setError(errorMessage);
      
      // Set empty state
      setAssets([]);
      setDataSource('offline');
      setAssetCounts({
        "All Assets": 0,
        "Spot Illus": 0,
        "Micro Illustration": 0,
        "Icons": 0,
        "Projects": 0
      });
      
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV export
  const handleExportCSV = async () => {
    if (assets.length === 0) {
      toast.error("No assets to export", {
        description: "Please add some assets first before exporting."
      });
      return;
    }

    setIsExporting(true);
    
    try {
      toast.loading("Preparing CSV export...", {
        description: `Exporting ${assets.length} assets from ${dataSource === 'database' ? 'Database: Appwrite' : 'KV Store'}`
      });

      const result = await exportAssetsToCSV();
      
      if (result.success) {
        toast.success("CSV exported successfully!", {
          description: `Downloaded: ${result.filename || 'assets-export.csv'} (${assets.length} assets)`
        });
      } else {
        throw new Error(result.error || 'Export failed');
      }
      
    } catch (error) {
      console.error('🚨 Export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to export CSV';
      
      toast.error("Export failed", {
        description: errorMessage
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    loadAssets();
  };

  // Load assets on mount
  useEffect(() => {
    loadAssets();
  }, []);

  return {
    assets,
    assetCounts,
    loading,
    error,
    dataSource,
    isExporting,
    loadAssets,
    handleExportCSV,
    handleRefresh
  };
}