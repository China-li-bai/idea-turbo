/**
 * 同步控制组件 - 乔布斯哲学版
 * 
 * 特点：
 * 1. 简单直观：用户一眼就能理解当前状态
 * 2. 用户控制：用户决定何时同步，不强制自动同步
 * 3. 智能提醒：只在需要时显示同步提示
 * 4. 渐进增强：从基础功能开始，逐步增加高级功能
 */

import { useState } from 'react'
import { RefreshCw, Wifi, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSyncManager, isIOS14orBelow } from '@/services/decksUnified'

interface SyncControlProps {
  variant?: 'header' | 'floating' | 'inline'
  showLastSync?: boolean
  className?: string
}

export function SyncControl({ 
  variant = 'inline', 
  showLastSync = false,
  className = '' 
}: SyncControlProps) {
  const { isSyncing, syncStatus, lastSyncTime, sync, needsSync } = useSyncManager()
  const isIOS14 = isIOS14orBelow()

  // iOS 14用户始终显示同步控制
  if (!isIOS14 && !needsSync) {
    return null
  }

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return '从未同步'
    const minutes = Math.floor((Date.now() - timestamp) / 60000)
    if (minutes < 1) return '刚刚同步'
    if (minutes < 60) return `${minutes}分钟前同步`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前同步`
    return `${Math.floor(hours / 24)}天前同步`
  }

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Wifi className="h-4 w-4" />
    }
  }

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return '同步中...'
      case 'success':
        return '同步成功'
      case 'error':
        return '同步失败'
      default:
        return needsSync ? '需要同步' : '已同步'
    }
  }

  const handleSync = () => {
    sync(true) // 强制同步
  }

  if (variant === 'header') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={`h-10 w-10 rounded-full ${className}`}
        onClick={handleSync}
        disabled={isSyncing}
        aria-label="同步数据"
      >
        {getStatusIcon()}
      </Button>
    )
  }

  if (variant === 'floating') {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 h-12 px-4 rounded-full shadow-lg"
          variant={needsSync ? "default" : "secondary"}
        >
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </Button>
        {showLastSync && (
          <div className="text-xs text-muted-foreground text-center mt-2">
            {formatLastSync(lastSyncTime)}
          </div>
        )}
      </div>
    )
  }

  // 默认 inline 变体
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 状态指示器 */}
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className="text-sm">{getStatusText()}</span>
      </div>
      
      {/* 同步按钮 */}
      <Button
        onClick={handleSync}
        disabled={isSyncing}
        size="sm"
        variant={needsSync ? "default" : "outline"}
      >
        {isSyncing ? '同步中...' : '立即同步'}
      </Button>
      
      {/* 最后同步时间 */}
      {showLastSync && (
        <Badge variant="secondary" className="text-xs">
          {formatLastSync(lastSyncTime)}
        </Badge>
      )}
      
      {/* iOS 14标识 */}
      {isIOS14 && (
        <Badge variant="outline" className="text-xs">
          iOS 14
        </Badge>
      )}
    </div>
  )
}

/**
 * 智能同步提醒组件
 * 只在真正需要时显示，避免打扰用户
 */
export function SyncReminder() {
  const { needsSync, sync, isIOS14 } = useSyncManager()

  // 非iOS 14用户不需要同步提醒
  if (!isIOS14 || !needsSync) return null

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
        <Wifi className="h-4 w-4 text-orange-600" />
        <span className="text-sm">检测到新数据，建议同步</span>
        <Button
          size="sm"
          onClick={() => sync(true)}
          className="h-6 px-2 text-xs"
        >
          立即同步
        </Button>
      </div>
    </div>
  )
}