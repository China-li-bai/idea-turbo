/**
 * 社交学习Hook
 * 管理WebRTC DataChannel点对点学习社交功能
 * 遵循乔布斯哲学：简洁、直观、有温度的学习社交体验
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import SocialStudyService from '@/services/socialStudyService';
import type { 
  StudyRoom, 
  StudyUser, 
  ChatMessage, 
  Achievement, 
  StudySession,
  P2PConnectionState,
  RoomEvent,
  StudyStatus
} from '@/types/social-study';

interface UseSocialStudyOptions {
  roomId?: string;
  localUser?: Partial<StudyUser>;
  signalingUrl?: string | null;
  roomConfig?: any;
  offerStrategy?: "A" | "B";
  maxPeers?: number;
}

interface UseSocialStudyReturn {
  // 状态
  state: P2PConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  peers: Record<string, StudyUser>;
  chatMessages: ChatMessage[];
  achievements: Achievement[];
  currentSession: StudySession | null;
  
  // 方法
  setRoomId: (roomId: string, signalingUrl?: string | null) => Promise<void>;
  sendMessage: (text: string) => void;
  updateStatus: (status: StudyStatus) => void;
  startSession: () => void;
  endSession: () => void;
  
  // 事件处理
  onPeerJoined: (callback: (peerId: string, user: StudyUser) => void) => void;
  onPeerLeft: (callback: (peerId: string) => void) => void;
  onConnectionEstablished: (callback: (peerId: string) => void) => void;
  onConnectionClosed: (callback: (peerId: string) => void) => void;
  onMessageReceived: (callback: (message: ChatMessage) => void) => void;
  onUserStatusChanged: (callback: (peerId: string, status: StudyStatus) => void) => void;
  onAchievementUnlocked: (callback: (achievement: Achievement) => void) => void;
  onRoomEvent: (callback: (event: RoomEvent) => void) => void;
  onStateChanged: (callback: (state: P2PConnectionState) => void) => void;
  onError: (callback: (error: Error) => void) => void;
  
  // 清理
  destroy: () => void;
}

export const useSocialStudy = (options: UseSocialStudyOptions = {}): UseSocialStudyReturn => {
  const [state, setState] = useState<P2PConnectionState>({
    roomId: options.roomId || '',
    localId: '',
    peers: {},
    connections: {},
    chatLog: [],
    signalingUrl: options.signalingUrl || null,
    isConnected: false,
    isConnecting: false,
  });
  
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  
  const serviceRef = useRef<SocialStudyService | null>(null);
  const eventCallbacksRef = useRef<Record<string, Function>>({});
  
  // 初始化服务
  useEffect(() => {
    serviceRef.current = new SocialStudyService(options);
    
    // 设置事件监听
    serviceRef.current.on('onStateChanged', (newState: P2PConnectionState) => {
      setState(newState);
    });
    
    serviceRef.current.on('onAchievementUnlocked', (achievement: Achievement) => {
      setAchievements(prev => [...prev, achievement]);
    });
    
    serviceRef.current.on('onError', (error: Error) => {
      console.error('SocialStudy error:', error);
      eventCallbacksRef.current.onError?.(error);
    });
    
    // 如果提供了roomId，立即连接
    if (options.roomId) {
      serviceRef.current.setRoomId(options.roomId, options.signalingUrl);
    }
    
    return () => {
      if (serviceRef.current) {
        serviceRef.current.destroy();
        serviceRef.current = null;
      }
    };
  }, []);
  
  // 设置房间ID
  const setRoomId = useCallback(async (roomId: string, signalingUrl?: string | null) => {
    if (serviceRef.current) {
      await serviceRef.current.setRoomId(roomId, signalingUrl);
    }
  }, []);
  
  // 发送消息
  const sendMessage = useCallback((text: string) => {
    if (serviceRef.current) {
      serviceRef.current.sendMessage(text);
    }
  }, []);
  
  // 更新状态
  const updateStatus = useCallback((status: StudyStatus) => {
    if (serviceRef.current) {
      serviceRef.current.updateStatus(status);
    }
  }, []);
  
  // 开始学习会话
  const startSession = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.startSession();
      setCurrentSession(serviceRef.current.getState().currentSession);
    }
  }, []);
  
  // 结束学习会话
  const endSession = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.endSession();
      setCurrentSession(null);
    }
  }, []);
  
  // 事件处理器注册
  const onPeerJoined = useCallback((callback: (peerId: string, user: StudyUser) => void) => {
    eventCallbacksRef.current.onPeerJoined = callback;
    if (serviceRef.current) {
      serviceRef.current.on('onPeerJoined', callback);
    }
  }, []);
  
  const onPeerLeft = useCallback((callback: (peerId: string) => void) => {
    eventCallbacksRef.current.onPeerLeft = callback;
    if (serviceRef.current) {
      serviceRef.current.on('onPeerLeft', callback);
    }
  }, []);
  
  const onConnectionEstablished = useCallback((callback: (peerId: string) => void) => {
    eventCallbacksRef.current.onConnectionEstablished = callback;
    if (serviceRef.current) {
      serviceRef.current.on('onConnectionEstablished', callback);
    }
  }, []);
  
  const onConnectionClosed = useCallback((callback: (peerId: string) => void) => {
    eventCallbacksRef.current.onConnectionClosed = callback;
    if (serviceRef.current) {
      serviceRef.current.on('onConnectionClosed', callback);
    }
  }, []);
  
  const onMessageReceived = useCallback((callback: (message: ChatMessage) => void) => {
    eventCallbacksRef.current.onMessageReceived = callback;
    if (serviceRef.current) {
      serviceRef.current.on('onMessageReceived', callback);
    }
  }, []);
  
  const onUserStatusChanged = useCallback((callback: (peerId: string, status: StudyStatus) => void) => {
    eventCallbacksRef.current.onUserStatusChanged = callback;
    if (serviceRef.current) {
      serviceRef.current.on('onUserStatusChanged', callback);
    }
  }, []);
  
  const onAchievementUnlocked = useCallback((callback: (achievement: Achievement) => void) => {
    eventCallbacksRef.current.onAchievementUnlocked = callback;
    if (serviceRef.current) {
      serviceRef.current.on('onAchievementUnlocked', callback);
    }
  }, []);
  
  const onRoomEvent = useCallback((callback: (event: RoomEvent) => void) => {
    eventCallbacksRef.current.onRoomEvent = callback;
    if (serviceRef.current) {
      serviceRef.current.on('onRoomEvent', callback);
    }
  }, []);
  
  const onStateChanged = useCallback((callback: (state: P2PConnectionState) => void) => {
    eventCallbacksRef.current.onStateChanged = callback;
    if (serviceRef.current) {
      serviceRef.current.on('onStateChanged', callback);
    }
  }, []);
  
  const onError = useCallback((callback: (error: Error) => void) => {
    eventCallbacksRef.current.onError = callback;
    if (serviceRef.current) {
      serviceRef.current.on('onError', callback);
    }
  }, []);
  
  // 销毁
  const destroy = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.destroy();
      serviceRef.current = null;
    }
  }, []);
  
  return {
    // 状态
    state,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    peers: state.peers,
    chatMessages: state.chatLog,
    achievements,
    currentSession,
    
    // 方法
    setRoomId,
    sendMessage,
    updateStatus,
    startSession,
    endSession,
    
    // 事件处理
    onPeerJoined,
    onPeerLeft,
    onConnectionEstablished,
    onConnectionClosed,
    onMessageReceived,
    onUserStatusChanged,
    onAchievementUnlocked,
    onRoomEvent,
    onStateChanged,
    onError,
    
    // 清理
    destroy,
  };
};

export default useSocialStudy;