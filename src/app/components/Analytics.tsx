import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Asset, getAllAssets } from '../utils/appwriteApi';
import { BarChart3, Database, FileText, Layers, Palette, Shield, Sparkles, User, Users } from "./icons";

interface AnalyticsProps {
  onNavigateBack: () => void;
}

interface AssetStats {
  total: number;
  byType: {
    spot: number;
    micro: number;
    icon: number;
    other: number;
  };
}

export function Analytics({ onNavigateBack }: AnalyticsProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<AssetStats>({
    total: 0,
    byType: { spot: 0, micro: 0, icon: 0, other: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await getAllAssets();
      const allAssets = response.success ? response.data || [] : [];
      setAssets(allAssets);
      
      // Calculate statistics
      const total = allAssets.length;
      const byType = allAssets.reduce((acc, asset) => {
        const type = asset.category?.toLowerCase() || 'other';
        switch (type) {
          case 'spot illus':
          case 'spot':
            acc.spot++;
            break;
          case 'micro illustration':
          case 'micro':
            acc.micro++;
            break;
          case 'icons':
          case 'icon':
            acc.icon++;
            break;
          default:
            acc.other++;
            break;
        }
        return acc;
      }, { spot: 0, micro: 0, icon: 0, other: 0 });

      setStats({ total, byType });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color 
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    color: string; 
  }) => (
    <Card className="bg-card border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
          </div>
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon 
              className="w-6 h-6" 
              style={{ color: color }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const CategoryCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color 
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    color: string; 
  }) => (
    <Card className="bg-card border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6 text-center">
        <div 
          className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon 
            className="w-8 h-8" 
            style={{ color: color }}
          />
        </div>
        <h3 className="font-medium text-foreground mb-1">{title}</h3>
        <p 
          className="text-3xl font-bold"
          style={{ color: color }}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Top Stats */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <StatCard
            title="Total Assets"
            value={stats.total}
            icon={FileText}
            color="var(--pp-brand-blue)"
          />
        </div>

        {/* Asset Categories */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-6">Asset Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <CategoryCard
              title="Spot Illus"
              value={stats.byType.spot}
              icon={Palette}
              color="#f59e0b"
            />
            <CategoryCard
              title="Micro Illustration"
              value={stats.byType.micro}
              icon={Sparkles}
              color="var(--pp-brand-blue)"
            />
            <CategoryCard
              title="Icons"
              value={stats.byType.icon}
              icon={Layers}
              color="#8b5cf6"
            />
            <CategoryCard
              title="Other"
              value={stats.byType.other}
              icon={Database}
              color="#6b7280"
            />
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-foreground">
                Asset Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.byType).map(([type, count]) => {
                  const percentage = stats.total > 0 ? (count / stats.total * 100).toFixed(1) : '0';
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {type === 'spot' ? 'Spot Illus' : 
                         type === 'micro' ? 'Micro Illustration' : 
                         type === 'icon' ? 'Icons' : 
                         'Other'}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-foreground">
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">
                    Most Common Type
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {(() => {
                      const mostCommon = Object.entries(stats.byType).reduce((a, b) => a[1] > b[1] ? a : b)[0];
                      switch(mostCommon) {
                        case 'spot': return 'Spot Illus';
                        case 'micro': return 'Micro Illustration';
                        case 'icon': return 'Icons';
                        default: return 'Other';
                      }
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">
                    Empty Categories
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {Object.values(stats.byType).filter(count => count === 0).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">
                    Categories with Assets
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {Object.values(stats.byType).filter(count => count > 0).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}