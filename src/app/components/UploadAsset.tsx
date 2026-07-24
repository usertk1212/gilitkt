import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { CheckCircle, AlertCircle, FileText, Database, Download, Upload } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { bulkCreateAssets, Asset } from "../utils/appwriteApi";


interface UploadAssetProps {
  onNavigateBack: () => void;
}

interface ParsedAsset {
  nama_file: string;
  asset_name: string;
  url_lightroom: string;
  type: string;
}

export function UploadAsset({ onNavigateBack }: UploadAssetProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isStoring, setIsStoring] = useState(false);
  const [storeProgress, setStoreProgress] = useState(0);
  const [storeStatus, setStoreStatus] = useState<"idle" | "success" | "error">("idle");
  const [storedCount, setStoredCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate asset name from filename (remove prefixes and extensions)
  const generateAssetName = (filename: string): string => {
    return filename
      .replace(/\.(png|jpg|jpeg|svg)$/i, '') // Remove file extension
      .replace(/^(tds_si_|tds_mi_|tds_ic_)/, '') // Remove prefixes
      .replace(/_/g, ' ') // Replace underscores with spaces
      .trim();
  };

  // Generate type from filename prefix (fallback only)
  const generateTypeFromFilename = (filename: string): string => {
    if (filename.startsWith("tds_si_")) return "Spot";
    if (filename.startsWith("tds_mi_")) return "Micro";
    if (filename.startsWith("tds_ic_")) return "Icon";
    return "General";
  };

  // Validate category/type value
  const validateCategory = (category: string): string => {
    const normalizedCategory = category.trim();
    
    // Map common variations to standard types
    const categoryMap: Record<string, string> = {
      'spot': 'Spot',
      'spot illus': 'Spot',
      'spot illustration': 'Spot',
      'micro': 'Micro',
      'micro illustration': 'Micro',
      'micro illus': 'Micro',
      'icon': 'Icon',
      'icons': 'Icon',
      'general': 'General',
      'supergraphic': 'Supergraphic'
    };

    const mappedCategory = categoryMap[normalizedCategory.toLowerCase()];
    if (mappedCategory) {
      return mappedCategory;
    }

    // Return as-is if no mapping found (capitalize first letter)
    return normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1);
  };

  // Helper function to parse CSV row respecting quotes
  const parseCSVRow = (row: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    return result;
  };

  // Parse CSV content with 3-column support (nama_file, url_lightroom, category)
  const parseCSV = (content: string): { assets: ParsedAsset[]; errors: string[] } => {
    const lines = content.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
      return { assets: [], errors: ["CSV must have at least a header and one data row"] };
    }

    // Parse headers with improved CSV parsing
    const headerRow = lines[0];
    const headers = parseCSVRow(headerRow).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const assets: ParsedAsset[] = [];
    const errors: string[] = [];

    console.log('📋 CSV Headers found:', headers);

    // Check for expected columns (case-insensitive, flexible header support)
    const possibleNameColumns = ['nama_file', 'filename', 'asset_library_name', 'name', 'file_name'];
    const possibleUrlColumns = ['url_lightroom', 'lightroom', 'url', 'link', 'lightroom_url', 'image_url'];
    const possibleCategoryColumns = ['category', 'type', 'kind', 'class', 'classification'];
    
    let nameColumnIndex = -1;
    let urlColumnIndex = -1;
    let categoryColumnIndex = -1;
    
    // Find the name column (case-insensitive)
    for (const col of possibleNameColumns) {
      const index = headers.findIndex(h => h.includes(col) || col.includes(h));
      if (index !== -1) {
        nameColumnIndex = index;
        console.log(`✅ Found name column: ${headers[index]} at index ${index}`);
        break;
      }
    }
    
    // Find the URL column (case-insensitive)
    for (const col of possibleUrlColumns) {
      const index = headers.findIndex(h => h.includes(col) || col.includes(h));
      if (index !== -1) {
        urlColumnIndex = index;
        console.log(`✅ Found URL column: ${headers[index]} at index ${index}`);
        break;
      }
    }

    // Find the category column (optional)
    for (const col of possibleCategoryColumns) {
      const index = headers.findIndex(h => h.includes(col) || col.includes(h));
      if (index !== -1) {
        categoryColumnIndex = index;
        console.log(`✅ Found category column: ${headers[index]} at index ${index}`);
        break;
      }
    }
    
    if (nameColumnIndex === -1) {
      const detailedError = `Missing required filename column. 
      
Headers found: ${headers.join(', ')}
Expected one of: ${possibleNameColumns.join(', ')}

Please ensure your CSV has a column for the filename (nama_file, filename, or asset_library_name).`;
      
      errors.push(detailedError);
      return { assets, errors };
    }
    
    if (urlColumnIndex === -1) {
      const detailedError = `Missing required URL column.
      
Headers found: ${headers.join(', ')}
Expected one of: ${possibleUrlColumns.join(', ')}

Please ensure your CSV has a column for the image URL (url_lightroom, lightroom, url, or link).`;
      
      errors.push(detailedError);
      return { assets, errors };
    }

    console.log(`📋 Parsing ${lines.length - 1} data rows...`);
    console.log(`📊 Column mapping: filename=${nameColumnIndex}, url=${urlColumnIndex}, category=${categoryColumnIndex >= 0 ? categoryColumnIndex : 'auto-detect'}`);

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].trim();
      if (!row) continue; // Skip empty rows
      
      const values = parseCSVRow(row);
      
      if (values.length !== headers.length) {
        console.warn(`⚠️ Row ${i + 1} has ${values.length} columns, expected ${headers.length}. Skipping.`);
        continue; // Skip malformed rows
      }

      const nama_file = values[nameColumnIndex]?.trim().replace(/['"]/g, '');
      const url_lightroom = values[urlColumnIndex]?.trim().replace(/['"]/g, '');
      const categoryValue = categoryColumnIndex >= 0 ? values[categoryColumnIndex]?.trim().replace(/['"]/g, '') : '';

      // Validate required fields
      if (!nama_file || !url_lightroom) {
        console.warn(`⚠️ Row ${i + 1} missing required data (nama_file: "${nama_file}", url: "${url_lightroom}"). Skipping.`);
        continue; // Skip rows with missing data
      }

      // Validate URL format
      try {
        new URL(url_lightroom);
      } catch {
        console.warn(`⚠️ Row ${i + 1} has invalid URL: "${url_lightroom}". Skipping.`);
        continue; // Skip invalid URLs
      }

      // Determine category/type
      let finalCategory: string;
      if (categoryValue) {
        // Use provided category
        finalCategory = validateCategory(categoryValue);
        console.log(`📝 Using provided category: ${categoryValue} → ${finalCategory}`);
      } else {
        // Fallback to filename-based detection
        finalCategory = generateTypeFromFilename(nama_file);
        console.log(`🔍 Auto-detected category from filename: ${nama_file} → ${finalCategory}`);
      }

      // Generate asset data
      const asset: ParsedAsset = {
        nama_file: nama_file,
        asset_name: generateAssetName(nama_file),
        url_lightroom: url_lightroom,
        type: finalCategory
      };

      assets.push(asset);
      console.log(`✅ Parsed asset: ${asset.nama_file} (${asset.type})`);
    }

    console.log(`📊 CSV parsing complete: ${assets.length} valid assets parsed`);
    return { assets, errors };
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrorMessage("Please select a CSV file");
      setStoreStatus("error");
      return;
    }

    setSelectedFile(file);
    setStoreStatus("idle");
    setErrorMessage("");
  };

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle click on upload area (not on other buttons)
  const handleUploadAreaClick = (e: React.MouseEvent) => {
    // Only trigger file input if clicking on the upload area itself
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.upload-content')) {
      fileInputRef.current?.click();
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.endsWith('.csv'));
    
    if (csvFile) {
      handleFileSelect(csvFile);
    } else {
      setErrorMessage("Please drop a CSV file");
      setStoreStatus("error");
    }
  };

  // Handle storing assets to the Appwrite database
  const handleStoreAssets = async () => {
    if (!selectedFile) return;

    setIsStoring(true);
    setStoreProgress(0);
    setStoreStatus("idle");

    try {
      // Step 1: Read the CSV file
      setStoreProgress(20);
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(selectedFile);
      });

      // Step 2: Parse the data
      setStoreProgress(40);
      console.log('📋 Starting CSV parsing...');
      const { assets, errors } = parseCSV(content);
      
      if (errors.length > 0) {
        console.error('🚨 CSV parsing errors:', errors);
        throw new Error(errors[0]);
      }
      
      if (assets.length === 0) {
        throw new Error("No valid assets found in CSV file. Please check your data format and try again.");
      }

      console.log(`✅ Successfully parsed ${assets.length} assets from CSV`);

      // Step 3: Store to the Appwrite database
      setStoreProgress(40);
      console.log(`📦 Storing ${assets.length} assets to the Appwrite database with filename keys...`);

      const response = await bulkCreateAssets(assets, (done, total) => {
        // Real per-row progress: 40% (parsing done) to 100% (all rows processed),
        // instead of freezing at a fixed number while the throttled import runs.
        const pct = total > 0 ? 40 + Math.round((done / total) * 60) : 100;
        setStoreProgress(pct);
      });
      
      if (!response.success) {
        throw new Error(response.error || "Failed to store assets to database");
      }
      
      const createdAssets = response.data || [];
      console.log(`✅ Successfully stored ${createdAssets.length} assets to database`);
      
      setStoreProgress(100);
      setStoredCount(createdAssets.length);
      setStoreStatus("success");

    } catch (error) {
      console.error('🚨 Error storing assets:', error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to store assets");
      setStoreStatus("error");
    } finally {
      setIsStoring(false);
    }
  };

  // Download CSV template with 3-column structure
  const downloadTemplate = () => {
    const template = `nama_file,url_lightroom,category
tds_si_example_illustration.png,https://example.com/image1.jpg,Spot
tds_mi_sample_icon.png,https://example.com/image2.jpg,Micro
tds_ic_menu_icon.png,https://example.com/image3.jpg,Icon
custom_graphic.png,https://example.com/image4.jpg,Supergraphic`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto space-y-6">
      {/* CSV Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            CSV Template
          </CardTitle>
          <CardDescription>
            Download the 3-column template with filename, URL, and category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadTemplate} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
          <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>CSV Format (3 columns):</strong>
            </p>
            <div className="text-xs font-mono bg-background p-2 rounded border">
              nama_file,url_lightroom,category<br/>
              tds_si_example.png,https://...,Spot<br/>
              tds_mi_icon.png,https://...,Micro
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>Required Columns:</strong><br/>
              • <code>nama_file</code> (or filename, asset_library_name)<br/>
              • <code>url_lightroom</code> (or lightroom, url, link)<br/>
              • <code>category</code> (or type) - <em>Optional</em><br/><br/>
              <strong>Valid Categories:</strong> Spot, Micro, Icon, Supergraphic, General<br/>
              If category is not provided, it will be auto-detected from filename prefixes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className={`transition-all duration-200 ${isDragOver ? 'border-primary bg-primary/5' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Your CSV File
          </CardTitle>
          <CardDescription>
            Select or drag and drop your CSV file with 3 columns: nama_file, url_lightroom, category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
              isDragOver 
                ? 'border-primary bg-primary/5' 
                : selectedFile 
                  ? 'border-green-500 bg-green-50 dark:bg-green-950' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadAreaClick}
          >
            <div className="upload-content">
              {selectedFile ? (
                <div className="space-y-4">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      3-column CSV ready for database storage
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="font-medium">Drop your 3-column CSV file here</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      or click to browse files<br/>
                      <span className="text-xs">Format: nama_file, url_lightroom, category</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Store to Database Button - Only show when file is selected */}
          {selectedFile && !isStoring && storeStatus !== "success" && (
            <div className="mt-6">
              <Button 
                onClick={handleStoreAssets}
                className="w-full"
                size="lg"
              >
                <Database className="w-4 h-4 mr-2" />
                Store Assets to Database: Appwrite
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Progress */}
      {isStoring && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="text-center">
                <Database className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Storing assets to Database: Appwrite...</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {storeProgress < 20 ? "Reading CSV file..." :
                     storeProgress < 40 ? "Parsing asset data with categories..." :
                     storeProgress < 100 ? "Storing to Database: Appwrite..." :
                     "Complete!"}
                  </span>
                  <span>{storeProgress}%</span>
                </div>
                <Progress value={storeProgress} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message - Only show after successful storage */}
      {storeStatus === "success" && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            <div className="space-y-3">
              <p className="font-medium">✅ Assets successfully stored to Database: Appwrite!</p>
              <p>Successfully processed and stored {storedCount} assets with categories.</p>
              <div className="pt-2">
                <p className="text-sm">Process completed:</p>
                <ul className="text-sm list-disc list-inside mt-1 space-y-1">
                  <li>✅ Read CSV file: {selectedFile?.name}</li>
                  <li>✅ Parsed data with filename, URL, and category columns</li>
                  <li>✅ Stored {storedCount} assets with custom categories</li>
                  <li>✅ Assets are now available in your dashboard</li>
                </ul>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => {
                    setStoreStatus("idle");
                    setSelectedFile(null);
                    setStoredCount(0);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  variant="default" 
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload More Assets
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {storeStatus === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Failed to store assets</p>
              <div className="text-sm whitespace-pre-line">{errorMessage}</div>
              <Button 
                onClick={() => {
                  setStoreStatus("idle");
                  setSelectedFile(null);
                  setErrorMessage("");
                }}
                variant="outline" 
                size="sm"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}


    </div>
  );
}