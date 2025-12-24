/**
 * 同步设置页面 - 乔布斯哲学版
 * 
 * 设计理念：
 * 1. 简单至上：只显示最重要的设置
 * 2. 用户掌控：用户完全控制何时同步
 * 3. 透明清晰：用户知道数据从哪里来，到哪里去
 * 4. 渐进披露：基础功能在前，高级功能在后
 * Refactored to use SyncSettingsService for data access.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Database, Wifi, Smartphone, Info, CheckCircle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useSyncManager, useDecks } from '@/services/decksUnified'
import { SyncControl } from '@/components/SyncControl'
import { getSyncSettingsService, SyncSettings, SyncStatus } from '@/services/SyncSettingsService'
import { useAuth } from '@/contexts/AuthContext'

export function SyncSettings() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isSyncing, syncStatus, lastSyncTime, sync } = useSyncManager()
  const { decks, isFromCache } = useDecks()
  
  // 获取同步设置服务实例
  const syncSettingsService = getSyncSettingsService()
  
  // 状态管理
  const [syncSettings, setSyncSettings] = useState<SyncSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 获取设备信息
  const isIOS14 = syncSettingsService.isIOS14orBelow()
  
  // 加载同步设置
  useEffect(() => {
    const loadSyncSettings = async () => {
      if (!user) return
      
      try {
        setIsLoading(true)
        const settings = await syncSettingsService.getOrCreateSyncSettings(user.id)
        setSyncSettings(settings)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载同步设置失败')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSyncSettings()
  }, [user, syncSettingsService])
  
  // 处理自动同步切换
  const handleAutoSyncChange = async (enabled: boolean) => {
    if (!user) return
    
    try {
      const result = await syncSettingsService.toggleAutoSync(user.id, enabled)
      if (result.success && syncSettings) {
        setSyncSettings({ ...syncSettings, auto_sync: enabled })
      } else {
        setError(result.error || '更新自动同步设置失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新自动同步设置失败')
    }
  }
  
  // 处理同步选项切换
  const handleSyncOptionChange = async (option: 'sync_decks' | 'sync_cards' | 'sync_progress', enabled: boolean) => {
    if (!user || !syncSettings) return
    
    try {
      const result = await syncSettingsService.updateSyncSettings(user.id, { [option]: enabled })
      if (result.success) {
        setSyncSettings({ ...syncSettings, [option]: enabled })
      } else {
        setError(result.error || `更新${option}设置失败`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `更新${option}设置失败`)
    }
  }

  const formatLastSync = (timestamp: number | null) => {
    return syncSettingsService.formatLastSync(timestamp)
  }

  const getDataTypeInfo = () => {
    const syncMethod = syncSettings?.sync_method || syncSettingsService.getOptimalSyncMethod()
    return syncSettingsService.getDataSourceInfo(syncMethod)
  }

  const dataInfo = getDataTypeInfo()
  const Icon = dataInfo.icon === 'Wifi' ? Wifi : Database

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">加载同步设置中...</p>
        </div>
      </div>
    )
  }

  // 显示错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>重试</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center px-4 backdrop-blur-sm bg-background/80">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="flex-1 text-center text-lg font-semibold">同步设置</h1>
        <div className="w-10" />
      </header>

      <div className="p-4 space-y-6">
        {/* 数据源状态卡片 */}
        <Card className={`${dataInfo.bgColor} border-2`}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Icon className={`h-6 w-6 ${dataInfo.color}`} />
              <div>
                <CardTitle className="text-lg">{dataInfo.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{dataInfo.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{dataInfo.subtitle}</p>
            {isFromCache && (
              <Badge variant="secondary" className="mt-2">
                <Wifi className="h-3 w-3 mr-1" />
                当前使用缓存
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* 快速同步控制 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              快速同步
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SyncControl 
              variant="inline" 
              showLastSync={true}
              className="w-full justify-between"
            />
            
            <div className="text-sm text-muted-foreground">
              <p>• 最后同步：{formatLastSync(lastSyncTime)}</p>
              <p>• 数据统计：{decks.length} 个牌组</p>
              {isFromCache && <p>• 缓存模式：减少网络请求，提升响应速度</p>}
            </div>
          </CardContent>
        </Card>

        {/* 同步设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">同步设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 自动同步设置 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">自动同步</p>
                <p className="text-sm text-muted-foreground">
                  定期检查并同步最新数据
                </p>
              </div>
              <Switch
                checked={syncSettings?.auto_sync || false}
                onCheckedChange={handleAutoSyncChange}
                disabled={isSyncing}
              />
            </div>

            {/* 数据同步选项 */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-medium">同步内容</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">牌组数据</p>
                  <p className="text-xs text-muted-foreground">同步所有牌组信息</p>
                </div>
                <Switch 
                  checked={syncSettings?.sync_decks || false} 
                  onCheckedChange={(enabled) => handleSyncOptionChange('sync_decks', enabled)}
                  disabled={!isIOS14}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">卡片数据</p>
                  <p className="text-xs text-muted-foreground">同步所有卡片内容和进度</p>
                </div>
                <Switch 
                  checked={syncSettings?.sync_cards || false} 
                  onCheckedChange={(enabled) => handleSyncOptionChange('sync_cards', enabled)}
                  disabled={!isIOS14}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">学习进度</p>
                  <p className="text-xs text-muted-foreground">同步FSRS学习记录和统计数据</p>
                </div>
                <Switch 
                  checked={syncSettings?.sync_progress || false} 
                  onCheckedChange={(enabled) => handleSyncOptionChange('sync_progress', enabled)}
                  disabled={!isIOS14}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 设备信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              设备信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>设备类型</span>
              <Badge variant={isIOS14 ? "destructive" : "secondary"}>
                {isIOS14 ? "iOS 14" : "现代浏览器"}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>数据库引擎</span>
              <span className="font-mono text-xs">
                {syncSettings?.sync_method === 'supabase' ? "Supabase" : "PGlite"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>网络状态</span>
              <Badge variant="outline">
                <Wifi className="h-3 w-3 mr-1" />
                在线
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 帮助信息 */}
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-5 w-5" />
              关于同步
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isIOS14 ? (
              <>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">iOS 14 优化</p>
                    <p className="text-xs text-muted-foreground">
                      由于iOS 14不支持本地数据库，我们使用智能缓存技术减少网络请求，提升使用体验。
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">数据安全</p>
                    <p className="text-xs text-muted-foreground">
                      所有数据都存储在Supabase云端，即使清除缓存也不会丢失。
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">本地优先</p>
                  <p className="text-xs text-muted-foreground">
                    您的数据存储在本地设备，无需网络即可正常使用所有功能。同步仅用于数据备份和多设备同步。
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}