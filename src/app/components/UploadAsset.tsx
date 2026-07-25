import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { CheckCircle, AlertCircle, FileText, Database, Download, Upload } from "./icons";
import { Alert, AlertDescription } from "./ui/alert";
import { bulkCreateAssets, Asset } from "../utils/appwriteApi";
import { parseCSV } from "../utils/csvParser";


interface UploadAssetProps {
  onNavigateBack: () => void;
}

export function UploadAsset({ onNavigateBack }: UploadAssetProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isStoring, setIsStoring] = useState(false);
  const [storeProgress, setStoreProgress] = useState(0);
  const [storeStatus, setStoreStatus] = useState<"idle" | "success" | "error">("idle");
  const [storedCount, setStoredCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [updateExistingType, setUpdateExistingType] = useState(false);
  const [updatedCount, setUpdatedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const response = await bulkCreateAssets(
        assets,
        (done, total) => {
          // Real per-row progress: 40% (parsing done) to 100% (all rows processed),
          // instead of freezing at a fixed number while the throttled import runs.
          const pct = total > 0 ? 40 + Math.round((done / total) * 60) : 100;
          setStoreProgress(pct);
        },
        { updateExistingType }
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to store assets to database");
      }

      const createdAssets = response.data || [];
      console.log(`✅ Successfully stored ${createdAssets.length} assets to database`);

      setStoreProgress(100);
      setStoredCount(createdAssets.length);
      setUpdatedCount(response.updatedCount || 0);
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
              <strong>Valid Categories:</strong> Spot, Micro, Icon, Supergraphic, Other, General<br/>
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
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                <Checkbox
                  id="update-existing-type"
                  checked={updateExistingType}
                  onCheckedChange={(checked) => setUpdateExistingType(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="update-existing-type" className="text-sm font-normal leading-snug cursor-pointer">
                  Update the <strong>type</strong> of assets whose filename already exists in the
                  database (asset_name and URL stay as they are — only type is updated). Leave
                  this off and existing assets are left untouched.
                </Label>
              </div>
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
              <p>
                {storedCount} asset baru disimpan
                {updatedCount > 0 ? `, ${updatedCount} asset lama diperbarui type-nya` : ""}.
              </p>
              <div className="pt-2">
                <p className="text-sm">Process completed:</p>
                <ul className="text-sm list-disc list-inside mt-1 space-y-1">
                  <li>✅ Read CSV file: {selectedFile?.name}</li>
                  <li>✅ Parsed data with filename, URL, and category columns</li>
                  <li>✅ Stored {storedCount} new assets with custom categories</li>
                  {updatedCount > 0 && <li>✅ Updated type for {updatedCount} existing assets</li>}
                  <li>✅ Assets are now available in your dashboard</li>
                </ul>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => {
                    setStoreStatus("idle");
                    setSelectedFile(null);
                    setStoredCount(0);
                    setUpdatedCount(0);
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