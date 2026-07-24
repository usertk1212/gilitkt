import { useState } from "react";
import { AssetDashboard } from "./components/AssetDashboard";
import { AssetManagement } from "./components/AssetManagement";
import { UploadAsset } from "./components/UploadAsset";
import { ManageAsset } from "./components/ManageAsset";
import { Analytics } from "./components/Analytics";
import { AdminGate } from "./components/AdminGate";
import { AdminSettings } from "./components/AdminSettings";
import { CsvViewer } from "./components/CsvViewer";
import { SharedSidebar } from "./components/SharedSidebar";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { Upload, Settings, BarChart3, ArrowLeft, Menu, Download, RefreshCw, KeyRound, Eye } from "lucide-react";
import { useAssetData } from "./components/hooks/useAssetData";

type ViewType = "dashboard" | "asset-menu";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [dashboardKey, setDashboardKey] = useState(0);
  const [activeTab, setActiveTab] = useState("upload");

  // Asset data for sidebar (only used in asset-menu view)
  const { 
    assets, 
    assetCounts, 
    loading, 
    error, 
    dataSource, 
    isExporting, 
    handleRefresh, 
    handleExportCSV 
  } = useAssetData();

  const handleNavigateToDashboard = () => {
    setCurrentView("dashboard");
    // Force dashboard to refresh by changing its key
    setDashboardKey(prev => prev + 1);
  };

  const handleNavigateToAssetMenu = () => {
    setCurrentView("asset-menu");
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Dummy function for category click (not used in asset management)
  const handleCategoryClick = (category: string) => {
    console.log(`Category clicked: ${category}`);
  };

  // Admin Menu (Upload / Manage / Analytics / Export / Settings) — gated behind a password
  if (currentView === "asset-menu") {
    return (
      <AdminGate>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            {/* Sidebar */}
            <SharedSidebar
              onNavigateBack={handleNavigateToDashboard}
              onCategoryClick={handleCategoryClick}
              assetCounts={assetCounts}
              assets={assets}
              loading={loading}
              error={error}
              dataSource={dataSource}
              handleRefresh={handleRefresh}
              showBackButton={true}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="border-b bg-card">
                <div className="flex h-16 items-center px-6 gap-4">
                  <SidebarTrigger className="lg:hidden">
                    <Menu className="w-5 h-5" />
                  </SidebarTrigger>
                  <h1 className="text-xl font-semibold text-foreground">Admin</h1>
                </div>
              </div>

              {/* Tab System */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
                  {/* Tab Navigation */}
                  <div className="border-b bg-card px-6 flex-shrink-0 overflow-x-auto">
                    <TabsList className="grid w-full max-w-3xl grid-cols-6 bg-muted/30">
                      <TabsTrigger
                        value="upload"
                        className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Asset
                      </TabsTrigger>
                      <TabsTrigger
                        value="manage"
                        className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
                      >
                        <Settings className="w-4 h-4" />
                        Manage Asset
                      </TabsTrigger>
                      <TabsTrigger
                        value="analytics"
                        className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                      </TabsTrigger>
                      <TabsTrigger
                        value="csv-viewer"
                        className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
                      >
                        <Eye className="w-4 h-4" />
                        CSV Viewer
                      </TabsTrigger>
                      <TabsTrigger
                        value="export"
                        className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </TabsTrigger>
                      <TabsTrigger
                        value="settings"
                        className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
                      >
                        <KeyRound className="w-4 h-4" />
                        Settings
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-hidden overflow-y-auto">
                    <TabsContent value="upload" className="h-full m-0 overflow-hidden">
                      <UploadAsset onNavigateBack={() => setActiveTab("upload")} />
                    </TabsContent>

                    <TabsContent value="manage" className="h-full m-0 overflow-hidden">
                      <ManageAsset onNavigateBack={() => setActiveTab("manage")} />
                    </TabsContent>

                    <TabsContent value="analytics" className="h-full m-0 overflow-hidden">
                      <Analytics onNavigateBack={() => setActiveTab("analytics")} />
                    </TabsContent>

                    <TabsContent value="csv-viewer" className="h-full m-0 overflow-y-auto">
                      <CsvViewer />
                    </TabsContent>

                    <TabsContent value="export" className="h-full m-0">
                      <div className="flex-1 p-6 max-w-md mx-auto space-y-4">
                        <div className="rounded-lg border bg-card p-6 space-y-4">
                          <div>
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                              <Download className="w-5 h-5" />
                              Export CSV
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                              Download semua asset yang ada di database sekarang sebagai file CSV.
                            </p>
                          </div>
                          <Button
                            onClick={handleExportCSV}
                            disabled={isExporting || assets.length === 0}
                            className="w-full"
                          >
                            {isExporting ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 mr-2" />
                            )}
                            {assets.length === 0 ? "No assets to export" : `Export ${assets.length} assets`}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="settings" className="h-full m-0 overflow-hidden">
                      <AdminSettings />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </SidebarProvider>
      </AdminGate>
    );
  }

  // Main Asset Dashboard
  return (
    <AssetDashboard 
      key={dashboardKey} 
      onNavigateToAssetManagement={handleNavigateToAssetMenu} 
    />
  );
}