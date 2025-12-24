/**
 * 社交学习相关的数据结构定义
 * 遵循乔布斯哲学：简洁、直观、有温度的学习社交体验
 */

// 学习状态类型
export type StudyStatus = 'idle' | 'studying' | 'break' | 'completed';

// 房间状态类型
export type RoomStatus = 'active' | 'quiet' | 'focus';

// 用户状态类型
export type UserStatus = 'online' | 'away' | 'studying' | 'break';

// 学习房间信息
export interface StudyRoom {
  id: string;
  name: string;
  description?: string;
  topic?: string;
  hostId: string;
  hostName: string;
  participants: number;
  maxParticipants: number;
  status: RoomStatus;
  createdAt: number;
  avgProgress?: number;
  totalStudyTime?: number; // 总学习时间（分钟）
  tags?: string[]; // 房间标签
  isPrivate?: boolean; // 是否为私有房间
  password?: string; // 房间密码（私有房间）
}

// 用户信息
export interface StudyUser {
  id: string;
  displayName: string;
  avatar?: string;
  status: UserStatus;
  currentStudyTime?: number; // 当前学习时长（分钟）
  totalStudyTime?: number; // 总学习时长（分钟）
  cardsCompleted?: number; // 完成的卡片数量
  focusLevel?: number; // 专注度等级 1-5
  joinedAt: number; // 加入房间时间
  lastActiveAt: number; // 最后活跃时间
}

// 学习会话信息
export interface StudySession {
  id: string;
  userId: string;
  roomId: string;
  status: StudyStatus;
  startTime: number;
  endTime?: number;
  duration?: number; // 学习时长（分钟）
  cardsStudied?: number; // 学习的卡片数量
  focusScore?: number; // 专注度评分
  interruptions?: number; // 中断次数
}

// 聊天消息类型
export interface ChatMessage {
  id: string;
  type: 'chat' | 'system' | 'motivation' | 'achievement';
  from: string;
  fromName?: string;
  text?: string;
  timestamp: number;
  roomId: string;
  subType?: string; // 子类型，如achievement的类型
  metadata?: Record<string, any>; // 附加元数据
}

// 学习成就类型
export interface Achievement {
  id: string;
  userId: string;
  roomId: string;
  type: 'focus_time' | 'cards_completed' | 'streak' | 'participation';
  title: string;
  description: string;
  icon?: string;
  unlockedAt: number;
  value?: number; // 成就值，如学习时长、卡片数量等
}

// 学习统计数据
export interface StudyStats {
  userId: string;
  roomId?: string;
  dailyTime: number; // 今日学习时间（分钟）
  weeklyTime: number; // 本周学习时间（分钟）
  monthlyTime: number; // 本月学习时间（分钟）
  totalCards: number; // 总学习卡片数
  currentStreak: number; // 当前连续学习天数
  longestStreak: number; // 最长连续学习天数
  avgFocusTime: number; // 平均专注时长（分钟）
  totalSessions: number; // 总学习会话数
}

// P2P连接状态
export interface P2PConnectionState {
  roomId: string;
  localId: string;
  peers: Record<string, StudyUser>;
  connections: Record<string, any>; // RTC连接
  chatLog: ChatMessage[];
  signalingUrl: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
}

// 房间事件类型
export type RoomEventType = 
  | 'user_joined'
  | 'user_left'
  | 'status_changed'
  | 'message_received'
  | 'achievement_unlocked'
  | 'session_started'
  | 'session_ended';

// 房间事件
export interface RoomEvent {
  type: RoomEventType;
  userId: string;
  timestamp: number;
  data?: any;
}

// 激励消息配置
export interface MotivationConfig {
  interval: number; // 激励消息间隔（毫秒）
  messages: string[]; // 激励消息列表
  triggers: {
    sessionStart: boolean;
    sessionEnd: boolean;
    milestones: number[]; // 里程碑时间点（分钟）
    achievements: boolean;
  };
}

// 学习房间配置
export interface RoomConfig {
  maxParticipants: number;
  allowChat: boolean;
  allowVoice: boolean;
  allowVideo: boolean;
  autoRecord: boolean;
  focusMode: boolean; // 专注模式（限制某些功能）
  pomodoroEnabled: boolean; // 番茄钟功能
  pomodoroTime: {
    work: number; // 工作时间（分钟）
    shortBreak: number; // 短休息（分钟）
    longBreak: number; // 长休息（分钟）
    longBreakInterval: number; // 长休息间隔
  };
}