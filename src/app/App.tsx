import { useState } from "react";
import { AssetDashboard } from "./components/AssetDashboard";
import { AssetManagement } from "./components/AssetManagement";
import { UploadAsset } from "./components/UploadAsset";
import { ManageAsset } from "./components/ManageAsset";
import { Analytics } from "./components/Analytics";
import { AdminGate } from "./components/AdminGate";
import { AdminSettings } from "./components/AdminSettings";
import { CsvViewer } from "./components/CsvViewer";
import { HardResetDatabase } from "./components/HardResetDatabase";
import { SharedSidebar, type AdminTab } from "./components/SharedSidebar";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent } from "./components/ui/tabs";
import { SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { Menu, Download, RefreshCw } from "lucide-react";
import { useAssetData } from "./components/hooks/useAssetData";

type ViewType = "dashboard" | "asset-menu";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [dashboardKey, setDashboardKey] = useState(0);
  const [activeTab, setActiveTab] = useState<AdminTab>("upload");

  const adminTabTitles: Record<AdminTab, string> = {
    upload: "Upload Asset",
    manage: "Manage Asset",
    analytics: "Analytics",
    "csv-viewer": "CSV Viewer",
    export: "Export CSV",
    "hard-reset": "Hard Reset Database",
    settings: "Settings",
  };

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

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
  };

  // Dummy function for category click (not used in asset management)
  const handleCategoryClick = (category: string) => {
    console.log(`Category clicked: ${category}`);
  };

  // Admin Menu (Upload / Manage / Analytics / CSV Viewer / Export / Hard Reset / Settings)
  // — gated behind a password. Navigation now lives entirely in the sidebar
  // instead of a duplicated top tab bar.
  if (currentView === "asset-menu") {
    return (
      <AdminGate>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            {/* Sidebar — shows the Admin submenu instead of the asset-type list */}
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
              mode="admin"
              activeAdminTab={activeTab}
              onAdminTabChange={handleTabChange}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="border-b bg-card">
                <div className="flex h-16 items-center px-6 gap-4">
                  <SidebarTrigger className="lg:hidden">
                    <Menu className="w-5 h-5" />
                  </SidebarTrigger>
                  <h1 className="text-xl font-semibold text-foreground">{adminTabTitles[activeTab]}</h1>
                </div>
              </div>

              {/* Tab Content — switching is driven by the sidebar, not a top tab bar */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <Tabs value={activeTab} className="h-full flex flex-col">
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

                    <TabsContent value="hard-reset" className="h-full m-0 overflow-hidden">
                      <HardResetDatabase />
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