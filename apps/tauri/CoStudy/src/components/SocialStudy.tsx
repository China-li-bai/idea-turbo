/**
 * SocialStudy - 社交学习组件
 * 遵循乔布斯哲学：简洁、直观、有温度的学习社交体验
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  BookOpen, 
  Clock, 
  Heart, 
  MessageCircle, 
  Sparkles,
  Coffee,
  Zap,
  Award,
  Target
} from "lucide-react"
import { useTranslation } from "react-i18next"
import P2PRoomService from '../services/p2pRoomService'

// 学习状态类型
type StudyStatus = 'idle' | 'studying' | 'break'
type StudyRoom = {
  id: string
  name: string
  participants: number
  maxParticipants: number
  topic?: string
  avgProgress?: number
  status: 'active' | 'quiet'
  hostName: string
}

export function SocialStudy() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [studyStatus, setStudyStatus] = useState<StudyStatus>('idle')
  const [isInRoom, setIsInRoom] = useState(false)
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null)
  const [availableRooms, setAvailableRooms] = useState<StudyRoom[]>([])
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [joinedPeers, setJoinedPeers] = useState<any[]>([])
  const [motivationalMessages, setMotivationalMessages] = useState<string[]>([])
  const p2pServiceRef = useRef<P2PRoomService | null>(null)

  // 模拟房间数据
  useEffect(() => {
    // 生成一些示例房间
    const mockRooms: StudyRoom[] = [
      {
        id: 'focus-25',
        name: '专注25分钟',
        participants: 3,
        maxParticipants: 6,
        avgProgress: 65,
        status: 'active',
        hostName: '学习者小明'
      },
      {
        id: 'vocab-master',
        name: '词汇大师',
        participants: 5,
        maxParticipants: 8,
        topic: '英语词汇',
        avgProgress: 42,
        status: 'active',
        hostName: '语言达人'
      },
      {
        id: 'zen-study',
        name: '静心学习',
        participants: 2,
        maxParticipants: 4,
        status: 'quiet',
        hostName: '冥想导师'
      }
    ]
    setAvailableRooms(mockRooms)
    
    // 添加激励语句
    const messages = [
      "坚持就是胜利！💪",
      "每个知识点都是进步的阶梯 🧗",
      "今天的努力，明天的实力 🌟",
      "相信自己，你很棒！👏",
      "学习使人进步，思考使人深刻 🤔"
    ]
    
    // 每30秒随机显示一条激励消息
    const interval = setInterval(() => {
      if (isInRoom) {
        const randomMessage = messages[Math.floor(Math.random() * messages.length)]
        setMotivationalMessages(prev => [...prev.slice(-2), randomMessage])
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [isInRoom])

  // 加入学习房间
  const handleJoinRoom = (room: StudyRoom) => {
    if (room.participants >= room.maxParticipants) {
      return // 房间已满
    }
    
    // 这里应该初始化P2P服务并加入房间
    initializeP2PRoom(room.id)
    setCurrentRoom(room)
    setIsInRoom(true)
    setStudyStatus('studying')
    
    // 更新房间的参与者数量
    setAvailableRooms(prev => 
      prev.map(r => 
        r.id === room.id 
          ? { ...r, participants: r.participants + 1 }
          : r
      )
    )
  }

  // 初始化P2P连接
  const initializeP2PRoom = (roomId: string) => {
    console.log('初始化P2P学习房间:', roomId)
    // 实际实现中，这里会创建P2PRoomService实例
    // const service = new P2PRoomService({
    //   roomId,
    //   signalingUrl: 'ws://localhost:8081', // 或使用我们的信令服务器
    //   offerStrategy: 'A',
    //   maxPeers: 10
    // })
    
    // 设置事件监听器...
    // p2pServiceRef.current = service
  }

  // 离开房间
  const handleLeaveRoom = () => {
    if (currentRoom && p2pServiceRef.current) {
      // 销毁P2P连接
      p2pServiceRef.current.destroy()
      p2pServiceRef.current = null
    }
    
    // 更新房间的参与者数量
    if (currentRoom) {
      setAvailableRooms(prev => 
        prev.map(r => 
          r.id === currentRoom.id 
            ? { ...r, participants: Math.max(0, r.participants - 1) }
            : r
        )
      )
    }
    
    setCurrentRoom(null)
    setIsInRoom(false)
    setStudyStatus('idle')
    setJoinedPeers([])
    setMotivationalMessages([])
  }

  // 开始专注学习
  const startFocusSession = () => {
    setStudyStatus('studying')
    // 可以集成番茄钟或专注计时器
  }

  // 休息
  const takeBreak = () => {
    setStudyStatus('break')
  }

  // 创建新房间
  const handleCreateRoom = (roomName: string, topic?: string) => {
    const newRoom: StudyRoom = {
      id: `room-${Date.now()}`,
      name: roomName,
      participants: 1, // 自己
      maxParticipants: 6,
      topic,
      status: 'active',
      hostName: '我'
    }
    
    setAvailableRooms(prev => [newRoom, ...prev])
    handleJoinRoom(newRoom)
    setShowCreateRoom(false)
  }

  // 如果不在房间，显示房间列表
  if (!isInRoom) {
    return (
      <div className="flex flex-col space-y-6 p-6 max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Heart className="h-8 w-8 fill-current" />
            <h1 className="text-3xl font-bold">学习不孤单</h1>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            与志同道合的学习者一起，让学习之路充满温暖与动力
          </p>
        </div>
        
        {/* 快速加入 */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">快速加入</h3>
                  <p className="text-sm text-muted-foreground">
                    一键加入活跃学习房间，立即开始专注学习
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => {
                  const activeRooms = availableRooms.filter(r => r.status === 'active' && r.participants < r.maxParticipants)
                  if (activeRooms.length > 0) {
                    handleJoinRoom(activeRooms[0])
                  }
                }}
                disabled={availableRooms.filter(r => r.status === 'active' && r.participants < r.maxParticipants).length === 0}
              >
                立即加入
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 创建房间 */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">创建学习房间</h3>
                  <p className="text-sm text-muted-foreground">
                    创建专属学习空间，邀请朋友一起学习
                  </p>
                </div>
              </div>
              <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
                <DialogTrigger asChild>
                  <Button variant="outline">创建房间</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>创建学习房间</DialogTitle>
                  </DialogHeader>
                  <CreateRoomForm onCreate={handleCreateRoom} />
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* 房间列表 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableRooms.map((room) => (
            <Card key={room.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{room.name}</h3>
                      <Badge variant={room.status === 'active' ? 'default' : 'secondary'}>
                        {room.status === 'active' ? '活跃' : '安静'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      主持人: {room.hostName}
                      {room.topic && ` · 主题: ${room.topic}`}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{room.participants}/{room.maxParticipants}</span>
                      </div>
                      
                      {room.avgProgress && (
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span>{room.avgProgress}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => handleJoinRoom(room)}
                    disabled={room.participants >= room.maxParticipants}
                    size="sm"
                  >
                    {room.participants >= room.maxParticipants ? '已满' : '加入'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // 在房间内的界面
  return (
    <div className="flex flex-col h-full">
      {/* 顶部状态栏 */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">{currentRoom?.name}</h2>
              <p className="text-sm text-muted-foreground">
                {joinedPeers.length + 1} 位学习者正在专注
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {studyStatus === 'studying' && (
              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  学习中
                </span>
              </Badge>
            )}
            {studyStatus === 'break' && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                <span className="flex items-center gap-1">
                  <Coffee className="h-3 w-3" />
                  休息中
                </span>
              </Badge>
            )}
            
            <Button variant="outline" onClick={handleLeaveRoom}>
              离开房间
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
        <Tabs defaultValue="room" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="room">学习空间</TabsTrigger>
            <TabsTrigger value="peers">学习伙伴</TabsTrigger>
            <TabsTrigger value="motivation">励志时刻</TabsTrigger>
          </TabsList>
          
          <TabsContent value="room" className="flex-1 flex flex-col">
            <div className="grid gap-6 md:grid-cols-3 flex-1">
              {/* 专注区域 */}
              <div className="md:col-span-2 space-y-6">
                <Card className="flex-1">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="text-center space-y-4 flex-1 flex flex-col justify-center">
                      <div className="flex justify-center">
                        <div className="relative">
                          <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-16 w-16 text-primary" />
                          </div>
                          {studyStatus === 'studying' && (
                            <div className="absolute inset-0 h-32 w-32 rounded-full border-4 border-primary animate-ping opacity-20"></div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-2xl font-semibold mb-2">
                          {studyStatus === 'studying' ? '专注学习中' : 
                           studyStatus === 'break' ? '休息时间' : '准备学习'}
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          {studyStatus === 'studying' ? 
                            '保持专注，你正在不断进步！每个知识点都是通往成功的阶梯。' :
                           studyStatus === 'break' ? 
                            '适当休息能提高学习效率，放松一下，准备下一阶段的专注。' :
                            '准备好开始学习了吗？点击下方按钮进入专注状态。'
                          }
                        </p>
                      </div>
                      
                      <div className="flex justify-center gap-3">
                        {studyStatus === 'idle' && (
                          <Button onClick={startFocusSession} size="lg">
                            <Target className="mr-2 h-4 w-4" />
                            开始专注学习
                          </Button>
                        )}
                        {studyStatus === 'studying' && (
                          <Button onClick={takeBreak} variant="outline" size="lg">
                            <Coffee className="mr-2 h-4 w-4" />
                            休息一下
                          </Button>
                        )}
                        {studyStatus === 'break' && (
                          <Button onClick={startFocusSession} size="lg">
                            <Target className="mr-2 h-4 w-4" />
                            继续学习
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* 快速操作 */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium">学习交流</h4>
                          <p className="text-sm text-muted-foreground">与学习伙伴交流心得</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30">
                          <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <h4 className="font-medium">学习成就</h4>
                          <p className="text-sm text-muted-foreground">查看学习进度</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* 学习氛围 */}
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      学习氛围
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">房间活跃度</span>
                        <span className="text-sm font-medium">85%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    
                    <div className="pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm">12人正在学习</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-sm">平均专注时长25分钟</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="text-sm">今日已共同学习2小时</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      学习时长
                    </h3>
                    
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold">25:43</div>
                      <p className="text-sm text-muted-foreground mt-2">今日总学习时长</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>本周</span>
                        <span className="font-medium">2h 18min</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>本月</span>
                        <span className="font-medium">8h 42min</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="peers" className="flex-1">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* 自己 */}
              <Card className="border-primary">
                <CardContent className="p-6 text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-4">
                    <AvatarImage src="" alt="我" />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">我</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold">你</h3>
                  <Badge variant="default" className="mt-2">房间创建者</Badge>
                  <div className="mt-4 space-y-2 text-sm">
                    <div>专注时长: 25分钟</div>
                    <div>完成卡片: 15张</div>
                  </div>
                </CardContent>
              </Card>
              
              {/* 其他学习者 */}
              {joinedPeers.map((peer, index) => (
                <Card key={peer.id}>
                  <CardContent className="p-6 text-center">
                    <Avatar className="h-16 w-16 mx-auto mb-4">
                      <AvatarImage src={peer.avatar} alt={peer.name} />
                      <AvatarFallback>{peer.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold">{peer.name}</h3>
                    <Badge variant={peer.status === 'active' ? 'default' : 'secondary'} className="mt-2">
                      {peer.status === 'active' ? '学习中' : '休息中'}
                    </Badge>
                    <div className="mt-4 space-y-2 text-sm">
                      <div>专注时长: {peer.focusTime}分钟</div>
                      <div>完成卡片: {peer.cardsCompleted}张</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="motivation" className="flex-1">
            <div className="space-y-4 max-w-2xl mx-auto">
              {motivationalMessages.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Sparkles className="h-12 w-12 text-primary/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">励志时刻</h3>
                    <p className="text-muted-foreground">
                      学习过程中会收到励志消息，帮助保持动力
                    </p>
                  </CardContent>
                </Card>
              ) : (
                motivationalMessages.map((message, index) => (
                  <Card key={index} className="animate-fade-in">
                    <CardContent className="p-6 text-center">
                      <Heart className="h-8 w-8 text-red-500 mx-auto mb-4" />
                      <p className="text-lg font-medium">{message}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// 创建房间表单组件
function CreateRoomForm({ onCreate }: { onCreate: (name: string, topic?: string) => void }) {
  const [roomName, setRoomName] = useState('')
  const [topic, setTopic] = useState('')
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (roomName.trim()) {
      onCreate(roomName.trim(), topic.trim() || undefined)
      setRoomName('')
      setTopic('')
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">房间名称</label>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="给房间起个名字"
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">学习主题 (可选)</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="例如: 英语词汇、数学复习"
        />
      </div>
      
      <Button type="submit" className="w-full">
        创建房间
      </Button>
    </form>
  )
}