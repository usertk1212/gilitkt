import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { healthCheck } from '../utils/appwriteApi';
import { Database, RefreshCw, Wifi, WifiOff } from "./icons";

export function DatabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkDatabaseStatus = async () => {
    try {
      setStatus('checking');
      const response = await healthCheck();
      
      if (response.success) {
        setStatus('online');
      } else {
        setStatus('offline');
      }
    } catch (error) {
      console.error('Database health check failed:', error);
      setStatus('offline');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkDatabaseStatus();
    setTimeout(() => setIsRefreshing(false), 500); // Brief delay for UX
  };

  useEffect(() => {
    checkDatabaseStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkDatabaseStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'offline':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'checking':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-muted border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Appwrite';
      case 'offline':
        return 'Offline';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <Wifi className="w-4 h-4" />;
      case 'offline':
        return <WifiOff className="w-4 h-4" />;
      case 'checking':
        return <Database className="w-4 h-4 animate-pulse" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Card className={`transition-all duration-200 ${getStatusColor()}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">
                Database: {getStatusText()}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-6 w-6 p-0 hover:bg-white/20"
              title="Refresh status"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}