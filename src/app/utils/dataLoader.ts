import { assetsData as initialAssetsData, type Asset } from "../data/assetsData";

// Load assets from the data file
export function loadAssets(): Asset[] {
  return initialAssetsData.assets;
}

// Save new assets to the assetsData.ts file
export async function saveAssets(newAssets: Asset[]): Promise<void> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get current assets and add new ones
  const currentAssets = loadAssets();
  const updatedAssets = [...currentAssets, ...newAssets];
  
  // Update the in-memory data first
  initialAssetsData.assets = updatedAssets;
  initialAssetsData.metadata.totalAssets = updatedAssets.length;
  initialAssetsData.metadata.lastUpdated = new Date().toISOString();
  
  // Create the new file content
  const fileContent = `export interface Asset {
  id: string;
  asset_library_name: string;
  asset_name: string;
  url_lightroom: string;
  type: string;
}

export interface AssetsData {
  assets: Asset[];
  metadata: {
    version: string;
    lastUpdated: string;
    totalAssets: number;
  };
}

export const assetsData: AssetsData = {
  assets: [
${updatedAssets.map(asset => `    {
      id: "${asset.id}",
      asset_library_name: "${asset.asset_library_name}",
      asset_name: "${asset.asset_name}",
      url_lightroom: "${asset.url_lightroom}",
      type: "${asset.type}"
    }`).join(',\n')}
  ],
  metadata: {
    version: "1.0",
    lastUpdated: "${new Date().toISOString()}",
    totalAssets: ${updatedAssets.length}
  }
};`;

  // Here we would write to the file - in a real app this would be done via API
  // For now, we'll use the in-memory update and notify that the file should be updated
  console.log(`Successfully saved ${newAssets.length} assets to the library`);
  console.log('Updated assetsData.ts content:', fileContent);
  
  // In a real application, you would make an API call like:
  // await fetch('/api/assets', { method: 'POST', body: JSON.stringify(updatedAssets) });
  
  return;
}

// Search assets by name or library name
export function searchAssets(query: string): Asset[] {
  const assets = loadAssets();
  const lowercaseQuery = query.toLowerCase();
  return assets.filter(asset => 
    asset.asset_name.toLowerCase().includes(lowercaseQuery) ||
    asset.asset_library_name.toLowerCase().includes(lowercaseQuery)
  );
}

// Filter assets by category
export function filterAssetsByCategory(assets: Asset[], category: string): Asset[] {
  if (category === "All Assets") return assets;
  
  const categoryMap: Record<string, string[]> = {
    "Illustration": ["Spot", "Micro"],
    "Spot Illus": ["Spot"],
    "Micro Illustration": ["Micro"],
    "Icons": ["Icon"]
  };
  
  const allowedTypes = categoryMap[category];
  if (!allowedTypes) return assets;
  
  return assets.filter(asset => allowedTypes.includes(asset.type));
}

// Get asset counts for sidebar
export function getAssetCounts(): Record<string, number> {
  const assets = loadAssets();
  
  const counts = {
    "All Assets": assets.length,
    "Illustration": assets.filter(a => ["Spot", "Micro"].includes(a.type)).length,
    "Spot Illus": assets.filter(a => a.type === "Spot").length,
    "Micro Illustration": assets.filter(a => a.type === "Micro").length,
    "Icons": assets.filter(a => a.type === "Icon").length,
    "Favorites": 0 // This would be calculated from user favorites
  };
  
  return counts;
}

// Generate thumbnail URL (placeholder for now)
export function generateThumbnail(asset: Asset): string {
  // In a real app, this might generate thumbnails or use a service
  return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop&crop=center`;
}

// Generate tags based on asset properties
export function generateTags(asset: Asset): string[] {
  const tags: string[] = [];
  
  // Add type-based tags
  if (asset.type === "Spot") {
    tags.push("Illustration", "Visual", "Graphic");
  } else if (asset.type === "Micro") {
    tags.push("Micro", "Small", "Icon");
  } else if (asset.type === "Icon") {
    tags.push("Icon", "UI", "Interface");
  }
  
  // Add name-based tags (simple word extraction)
  const nameWords = asset.asset_name.split(" ");
  nameWords.forEach(word => {
    if (word.length > 2) {
      tags.push(word.toLowerCase());
    }
  });
  
  return [...new Set(tags)]; // Remove duplicates
}

// Export the Asset type for use in other components
export type { Asset };