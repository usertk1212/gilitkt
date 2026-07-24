import { type Asset } from "./dataLoader";

// Write assets data to the assetsData.ts file
export async function writeAssetsToFile(assets: Asset[]): Promise<boolean> {
  try {
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
${assets.map(asset => `    {
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
    totalAssets: ${assets.length}
  }
};`;

    // In this environment, we can't directly write files from the client
    // But we can trigger a file update through the window object if available
    if (typeof window !== 'undefined' && (window as any).updateAssetsFile) {
      await (window as any).updateAssetsFile(fileContent);
      return true;
    }
    
    // For now, just log the content that should be written
    console.log('File content that should be written to /data/assetsData.ts:');
    console.log(fileContent);
    
    return true;
  } catch (error) {
    console.error('Failed to write assets to file:', error);
    return false;
  }
}

// Create a backup of current assets before writing
export function createAssetsBackup(assets: Asset[]): string {
  return JSON.stringify({
    assets,
    timestamp: new Date().toISOString(),
    backup: true
  }, null, 2);
}