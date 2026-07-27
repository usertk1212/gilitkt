import { useState } from "react";
import { AssetDashboard } from "./components/AssetDashboard";
import { AssetManagement } from "./components/AssetManagement";
import { ManageAsset } from "./components/ManageAsset";
import { Analytics } from "./components/Analytics";
import { AdminGate } from "./components/AdminGate";
import { AdminSettings } from "./components/AdminSettings";
import { CsvViewer } from "./components/CsvViewer";
import { HardResetDatabase } from "./components/HardResetDatabase";
import { AboutImageManager } from "./components/AboutImageManager";
import { BackupRestore } from "./components/BackupRestore";
import { ManualInput } from "./components/ManualInput";
import { SharedSidebar, type AdminTab } from "./components/SharedSidebar";
import { Tabs, TabsContent } from "./components/ui/tabs";
import { SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { Menu } from "./components/icons";
import { useAssetData } from "./components/hooks/useAssetData";
import { UploadJobProvider } from "./context/UploadJobContext";
import { UploadJobWidget } from "./components/UploadJobWidget";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";

type ViewType = "dashboard" | "asset-menu";

function AppShell() {
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [dashboardKey, setDashboardKey] = useState(0);
  const [activeTab, setActiveTab] = useState<AdminTab>("csv-viewer");

  const adminTabTitles: Record<AdminTab, string> = {
    manage: "Manage Asset",
    analytics: "Analytics",
    "csv-viewer": "Upload CSV",
    "manual-input": "Manual Input",
    backup: "Backup & Restore",
    "hard-reset": "Hard Reset Database",
    settings: "Settings",
    "about-image": "About Image",
  };

  // Asset data for sidebar (only used in asset-menu view)
  const { assets, assetCounts, loading, error, dataSource, handleRefresh } = useAssetData();

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

  // Admin Menu (Upload CSV / Manage / Analytics / Backup / Hard Reset / Settings)
  // — gated behind a password. Navigation now lives entirely in the sidebar
  // instead of a duplicated top tab bar.
  if (currentView === "asset-menu") {
    return (
      <AdminGate onCancel={handleNavigateToDashboard}>
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
                    <TabsContent value="manage" className="h-full m-0 overflow-hidden">
                      <ManageAsset onNavigateBack={() => setActiveTab("manage")} />
                    </TabsContent>

                    <TabsContent value="analytics" className="h-full m-0 overflow-hidden">
                      <Analytics onNavigateBack={() => setActiveTab("analytics")} />
                    </TabsContent>

                    <TabsContent value="csv-viewer" className="h-full m-0 overflow-y-auto">
                      <CsvViewer />
                    </TabsContent>

                    <TabsContent value="manual-input" className="h-full m-0 overflow-y-auto">
                      <ManualInput />
                    </TabsContent>

                    <TabsContent value="backup" className="h-full m-0 overflow-y-auto">
                      <BackupRestore />
                    </TabsContent>

                    <TabsContent value="hard-reset" className="h-full m-0 overflow-hidden">
                      <HardResetDatabase />
                    </TabsContent>

                    <TabsContent value="settings" className="h-full m-0 overflow-hidden">
                      <AdminSettings />
                    </TabsContent>

                    <TabsContent value="about-image" className="h-full m-0 overflow-y-auto">
                      <AboutImageManager />
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
/**
 * UploadJobProvider sits ABOVE the dashboard/superuser view switch on purpose:
 * a running CSV import must survive navigating back to the dashboard. If it
 * lived inside CsvViewer it would be torn down the moment that view unmounted
 * and the import would have to restart from row 0.
 *
 * UploadJobWidget is rendered here too so import progress and pause/resume are
 * reachable from every screen, not just the Upload CSV screen.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <UploadJobProvider>
        <AppShell />
        <UploadJobWidget />
        {/* Mounted once, at the root. Without this every toast() call in the app
            is a no-op — which is what it had been. */}
        <Toaster />
      </UploadJobProvider>
    </ErrorBoundary>
  );
}
