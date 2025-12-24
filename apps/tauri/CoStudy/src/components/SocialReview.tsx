/**
 * SocialReview - 社交复习组件
 * 在闪卡复习中集成P2P社交功能，创造"有人陪"的复习体验
 */
import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  Users, 
  Heart,
  Zap,
  Trophy,
  MessageCircle,
  ThumbsUp,
  Sparkles,
  BookOpen
} from "lucide-react"
import { useTranslation } from "react-i18next"
import P2PRoomService from '../services/p2pRoomService'

type PeerStatus = {
  id: string
  name: string
  status: 'reviewing' | 'break' | 'idle'
  progress: number
  cardsCompleted: number
  avatar?: string
}

type SocialStats = {
  activeUsers: number
  cardsReviewed: number
  avgStreak: number
  topLearner?: {
    name: string
    cardsCompleted: number
  }
}

export function SocialReview({ deckId, cardIndex, totalCards }: {
  deckId: string
  cardIndex: number
  totalCards: number
}) {
  const { t } = useTranslation()
  const [isSocialMode, setIsSocialMode] = useState(false)
  const [joinedPeers, setJoinedPeers] = useState<PeerStatus[]>([])
  const [socialStats, setSocialStats] = useState<SocialStats>({
    activeUsers: 0,
    cardsReviewed: 0,
    avgStreak: 0
  })
  const [showSocialPanel, setShowSocialPanel] = useState(false)
  const p2pServiceRef = useRef<P2PRoomService | null>(null)

  // 加入社交复习模式
  const handleJoinSocialReview = () => {
    if (isSocialMode) return

    // 创建P2P连接
    const service = new P2PRoomService({
      roomId: `deck-${deckId}-review`,
      signalingUrl: 'ws://localhost:8081', // 或我们的信令服务器
      offerStrategy: 'A',
      maxPeers: 10
    })

    // 设置事件监听器
    service
      .on('onPeerJoined', (peerId) => {
        console.log('新用户加入复习:', peerId)
        // 这里可以添加处理逻辑
      })
      .on('onPeerLeft', (peerId) => {
        console.log('用户离开复习:', peerId)
        setJoinedPeers(prev => prev.filter(p => p.id !== peerId))
      })
      .on('onMessageReceived', (message) => {
        // 处理复习进度等消息
        if (message.type === 'progress-update') {
          const data = JSON.parse(message.text || '{}')
          updatePeerProgress(data.peerId, data.progress, data.cardsCompleted)
        }
      })
      .on('onStateChanged', (newState) => {
        // 更新用户列表
        const peers = Object.entries(newState.peers).map(([id, peer]: [string, any]) => ({
          id,
          name: peer.displayName || `学习者${id.slice(-4)}`,
          status: 'reviewing',
          progress: 0,
          cardsCompleted: 0
        }))
        setJoinedPeers(peers)
        setSocialStats(prev => ({
          ...prev,
          activeUsers: peers.length + 1 // +1 for self
        }))
      })

    // 获取本地ID
    const currentState = service.getState()
    
    p2pServiceRef.current = service
    setIsSocialMode(true)
    
    // 模拟加入房间
    service.setRoomId(`deck-${deckId}-review`)
      .then(() => {
        console.log('已加入社交复习房间')
        // 广播当前进度
        broadcastProgress()
      })
      .catch(err => {
        console.error('加入社交复习失败:', err)
        setIsSocialMode(false)
      })
  }

  // 离开社交复习模式
  const handleLeaveSocialReview = () => {
    if (p2pServiceRef.current) {
      p2pServiceRef.current.destroy()
      p2pServiceRef.current = null
    }
    setIsSocialMode(false)
    setJoinedPeers([])
    setSocialStats({
      activeUsers: 0,
      cardsReviewed: 0,
      avgStreak: 0
    })
  }

  // 更新同伴进度
  const updatePeerProgress = (peerId: string, progress: number, cardsCompleted: number) => {
    setJoinedPeers(prev => 
      prev.map(p => 
        p.id === peerId 
          ? { ...p, progress, cardsCompleted }
          : p
      )
    )
    
    // 更新统计数据
    setSocialStats(prev => {
      const allPeers = [...prev.activeUsers > 0 ? joinedPeers : [], { cardsCompleted }].map(p => p.cardsCompleted)
      const total = allPeers.reduce((sum, count) => sum + count, 0)
      return {
        ...prev,
        cardsReviewed: total,
        avgStreak: Math.round(total / (allPeers.length || 1))
      }
    })
  }

  // 广播自己的进度
  const broadcastProgress = () => {
    if (!p2pServiceRef.current) return
    
    const progress = Math.round((cardIndex / totalCards) * 100)
    const message = {
      type: 'progress-update',
      peerId: p2pServiceRef.current.getState().localId,
      progress,
      cardsCompleted: cardIndex
    }
    
    p2pServiceRef.current.sendMessage(JSON.stringify(message))
  }

  // 监听卡片进度变化
  useEffect(() => {
    if (isSocialMode) {
      broadcastProgress()
    }
  }, [cardIndex, isSocialMode])

  // 清理资源
  useEffect(() => {
    return () => {
      if (p2pServiceRef.current) {
        p2pServiceRef.current.destroy()
      }
    }
  }, [])

  if (!isSocialMode) {
    // 加入社交模式卡片
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">一起复习</h3>
                <p className="text-xs text-muted-foreground">与学习者一起，复习更高效</p>
              </div>
            </div>
            <Button size="sm" onClick={handleJoinSocialReview}>
              加入
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 社交模式界面
  return (
    <div className="space-y-4">
      {/* 社交复习头部 */}
      <Card className="border-primary/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">社交复习模式</h3>
                <p className="text-xs text-muted-foreground">与 {socialStats.activeUsers} 位学习者一起复习</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowSocialPanel(!showSocialPanel)}
            >
              <Users className="h-4 w-4 mr-1" />
              {showSocialPanel ? '隐藏' : '查看'}
            </Button>
          </div>
          
          <div className="mt-3 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Trophy className="h-3 w-3 text-yellow-500" />
              <span>今日共复习 {socialStats.cardsReviewed} 张卡片</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-blue-500" />
              <span>平均连续 {socialStats.avgStreak} 张</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 社交面板 */}
      {showSocialPanel && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* 社交统计 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{socialStats.activeUsers}</div>
                  <div className="text-xs text-muted-foreground">在线学习者</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{socialStats.cardsReviewed}</div>
                  <div className="text-xs text-muted-foreground">今日复习</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{socialStats.avgStreak}</div>
                  <div className="text-xs text-muted-foreground">平均连续</div>
                </div>
              </div>

              <Separator />

              {/* 学习同伴列表 */}
              <div>
                <h4 className="font-medium text-sm mb-3 flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  学习同伴
                </h4>
                
                <div className="space-y-3">
                  {/* 自己 */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt="我" />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">我</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">你</span>
                        <Badge variant="default" className="text-xs">复习中</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">卡片 {cardIndex + 1}/{totalCards}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-primary h-1.5 rounded-full" 
                            style={{ width: `${Math.round((cardIndex / totalCards) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 其他学习者 */}
                  {joinedPeers.map((peer) => (
                    <div key={peer.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={peer.avatar} alt={peer.name} />
                        <AvatarFallback>{peer.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{peer.name}</span>
                          <Badge 
                            variant={peer.status === 'reviewing' ? 'default' : 'secondary'} 
                            className="text-xs"
                          >
                            {peer.status === 'reviewing' ? '复习中' : 
                             peer.status === 'break' ? '休息中' : '空闲'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            已完成 {peer.cardsCompleted} 张
                          </span>
                          <div className="w-20 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-green-500 h-1.5 rounded-full" 
                              style={{ width: `${peer.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 激励消息 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-medium text-sm">励志时刻</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  每一张卡片都是知识的积累，每一次复习都是向成功迈进！
                </p>
              </div>

              {/* 社交互动 */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  交流
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  鼓励
                </Button>
                <Button size="sm" variant="outline" onClick={handleLeaveSocialReview}>
                  离开
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}