/**
 * 用户类型检测组件 - 调试和测试用
 * 显示当前用户的设备类型和数据访问模式
 */

import { useState } from 'react'
import { Database, Wifi, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { isSpecialUser, isIOS14orBelow } from '@/services/decksUnified'

export function UserTypeDetector() {
  const [forceCacheMode, setForceCacheMode] = useState(
    localStorage.getItem('force_cache_mode') === 'true'
  )
  
  const isIOS14 = isIOS14orBelow()
  const isSpecial = isSpecialUser()

  const handleForceCacheChange = (checked: boolean) => {
    localStorage.setItem('force_cache_mode', checked.toString())
    setForceCacheMode(checked)
    // 刷新页面以应用更改
    window.location.reload()
  }

  const getUserType = () => {
    if (isIOS14) return 'iOS 14 用户'
    if (forceCacheMode) return '强制缓存用户'
    return '标准用户'
  }

  const getDataMode = () => {
    if (isSpecial) return '缓存模式'
    return '本地数据库模式'
  }

  const getIcon = () => {
    if (isSpecial) return <Wifi className="h-5 w-5" />
    return <Database className="h-5 w-5" />
  }

  const getColor = () => {
    if (isIOS14) return 'text-orange-600 bg-orange-50 dark:bg-orange-950/20'
    if (forceCacheMode) return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20'
    return 'text-green-600 bg-green-50 dark:bg-green-950/20'
  }

  return (
    <Card className={`${getColor()} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {getIcon()}
          用户类型检测
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 用户类型信息 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">用户类型</span>
            <Badge variant="secondary">{getUserType()}</Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">数据模式</span>
            <Badge variant={isSpecial ? "default" : "secondary"}>
              {getDataMode()}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">iOS 14</span>
            <Badge variant={isIOS14 ? "destructive" : "secondary"}>
              {isIOS14 ? '是' : '否'}
            </Badge>
          </div>
        </div>

        {/* 强制缓存模式开关 */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">强制缓存模式</span>
          </div>
          <Switch
            checked={forceCacheMode}
            onCheckedChange={handleForceCacheChange}
          />
        </div>

        {/* 设备信息 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 用户代理: {navigator.userAgent.substring(0, 50)}...</p>
          <p>• 特殊用户: {isSpecial ? '是' : '否'}</p>
          <p>• 强制缓存: {forceCacheMode ? '是' : '否'}</p>
        </div>

        {/* 刷新按钮 */}
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
          className="w-full"
        >
          刷新页面应用更改
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * 快速检测Badge - 显示在界面上提示当前模式
 */
export function UserTypeBadge() {
  const isSpecial = isSpecialUser()
  const isIOS14 = isIOS14orBelow()

  if (!isSpecial && !isIOS14) return null

  const getBadgeContent = () => {
    if (isIOS14) return 'iOS 14'
    if (isSpecial) return '缓存模式'
    return ''
  }

  const getBadgeVariant = () => {
    if (isIOS14) return 'destructive'
    return 'secondary'
  }

  return (
    <Badge variant={getBadgeVariant()} className="text-xs">
      <Wifi className="h-3 w-3 mr-1" />
      {getBadgeContent()}
    </Badge>
  )
}