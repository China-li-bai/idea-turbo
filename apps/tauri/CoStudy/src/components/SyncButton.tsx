import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getSyncService, type SyncResult, type SyncStatus } from '@/services/SyncService';
import { getAuthService } from '@/services/AuthService';

/**
 * 同步按钮组件
 * 
 * 用户主动同步数据的入口，符合 Linus "Never Break Userspace" 原则
 */
export function SyncButton() {
  const { t } = useTranslation();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // 检查登录状态
  React.useEffect(() => {
    const checkAuth = async () => {
      const authService = getAuthService();
      const user = await authService.getCurrentUser();
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, []);

  const syncService = getSyncService();

  // 监听同步状态
  React.useEffect(() => {
    return syncService.onStatusChange((status) => {
      setSyncStatus(status);
    });
  }, [syncService]);

  const handleFullSync = async () => {
    if (!isLoggedIn) {
      setLastResult({
        status: 'error',
        message: '请先登录才能同步数据',
        error: new Error('Not authenticated')
      });
      return;
    }

    const result = await syncService.fullSync();
    setLastResult(result);
  };

  const handleUpload = async () => {
    if (!isLoggedIn) {
      setLastResult({
        status: 'error',
        message: '请先登录才能上传数据',
        error: new Error('Not authenticated')
      });
      return;
    }

    const result = await syncService.uploadToSupabase();
    setLastResult(result);
  };

  const handleDownload = async () => {
    if (!isLoggedIn) {
      setLastResult({
        status: 'error',
        message: '请先登录才能下载数据',
        error: new Error('Not authenticated')
      });
      return;
    }

    const result = await syncService.downloadFromSupabase();
    setLastResult(result);
  };

  const isLoading = syncStatus === 'syncing';

  if (isLoggedIn === null) {
    return null; // 还在检查登录状态
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isLoggedIn ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          云端同步
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLoggedIn && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              需要登录才能使用云端同步功能
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleFullSync}
            disabled={!isLoggedIn || isLoading}
            className="w-full flex items-center justify-center gap-2"
            variant="default"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            双向同步
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!isLoggedIn || isLoading}
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              上传到云端
            </Button>

            <Button
              onClick={handleDownload}
              disabled={!isLoggedIn || isLoading}
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              从云端下载
            </Button>
          </div>
        </div>

        {/* 同步状态显示 */}
        <div className="flex items-center justify-center">
          <Badge 
            variant={
              syncStatus === 'success' ? 'default' :
              syncStatus === 'error' ? 'destructive' :
              syncStatus === 'syncing' ? 'secondary' : 'outline'
            }
            className="flex items-center gap-1"
          >
            {syncStatus === 'success' && <CheckCircle className="h-3 w-3" />}
            {syncStatus === 'error' && <XCircle className="h-3 w-3" />}
            {syncStatus === 'syncing' && <RefreshCw className="h-3 w-3 animate-spin" />}
            {syncStatus === 'idle' ? '就绪' :
             syncStatus === 'syncing' ? '同步中' :
             syncStatus === 'success' ? '成功' : '失败'}
          </Badge>
        </div>

        {/* 同步结果显示 */}
        {lastResult && (
          <Alert variant={lastResult.status === 'error' ? 'destructive' : 'default'}>
            <AlertDescription className="text-sm">
              {lastResult.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}