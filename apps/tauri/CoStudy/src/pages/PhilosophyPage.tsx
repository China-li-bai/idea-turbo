/**
 * Philosophy Showcase Page
 * 
 * 遵循 Linus 编程哲学：
 * - 好品味：消除特殊情况，使正常情况处理变得简单
 * - 不破坏用户空间：确保向后兼容性
 * - 实用主义：解决实际问题，而不是理论问题
 * - 简洁性：函数应该简短，只做一件事
 * 
 * Refactored to use PhilosophyPageService for data access
 */

import { useState, useEffect } from 'react';
import { useStudyRoom } from '@/contexts/StudyRoomContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getPhilosophyPageService } from '@/services/PhilosophyPageService';
import type { PhilosophyMode } from '@/components/study-room/PhilosophyBackground';
import type { PhilosophySettings, PhilosophySession } from '@/services/PhilosophyPageService';
import { CampfireCanvas } from '@/components/study-room/CampfireCanvas';
import { StarryNightCanvasSimple } from '@/components/study-room/StarryNightCanvasSimple';
import { Button } from '@/components/ui/button';
// 已移除PhilosophyDebugPanel导入，因为该组件已被删除
import { Wifi, WifiOff, Users, Flame, Sparkles, X } from 'lucide-react';
import '@/styles/philosophy.css';

// 在开发环境导入测试脚本
// 已移除测试脚本，因为它们已被删除

export function PhilosophyPage() {
    const { isConnected, joinRoom, leaveRoom, peers, broadcast } = useStudyRoom();
    const { userId, profile } = useUserProfile();
    const philosophyService = getPhilosophyPageService();
    
    const [mode, setMode] = useState<PhilosophyMode>('campfire');
    const [showDebug, setShowDebug] = useState(import.meta.env.DEV);
    const [philosophySettings, setPhilosophySettings] = useState<PhilosophySettings | null>(null);
    const [currentSession, setCurrentSession] = useState<PhilosophySession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 加载用户哲学设置
    useEffect(() => {
        const loadSettings = async () => {
            if (!userId) return;
            
            try {
                setIsLoading(true);
                const settings = await philosophyService.getPhilosophySettings(userId);
                
                if (settings) {
                    setPhilosophySettings(settings);
                    setMode(settings.preferred_mode as PhilosophyMode);
                    
                    // 如果设置了自动加入房间，则自动加入
                    if (settings.auto_join_room && !isConnected) {
                        joinRoom('philosophy-demo');
                    }
                } else {
                    // 创建默认设置
                    const defaultSettings = await philosophyService.upsertPhilosophySettings(userId, {
                        preferred_mode: 'campfire',
                        auto_join_room: true,
                        show_debug_info: import.meta.env.DEV
                    });
                    setPhilosophySettings(defaultSettings);
                    
                    // 自动加入房间
                    joinRoom('philosophy-demo');
                }
                
                setShowDebug(settings?.show_debug_info ?? import.meta.env.DEV);
            } catch (err) {
                setError(err instanceof Error ? err.message : '加载设置失败');
            } finally {
                setIsLoading(false);
            }
        };
        
        loadSettings();
    }, [userId, philosophyService, isConnected, joinRoom]);

    // 监听连接状态变化，记录会话
    useEffect(() => {
        if (!userId || !philosophySettings) return;
        
        const handleConnectionChange = async () => {
            if (isConnected && !currentSession) {
                // 开始新会话
                try {
                    const session = await philosophyService.startPhilosophySession(
                        userId, 
                        mode, 
                        'philosophy-demo'
                    );
                    setCurrentSession(session);
                } catch (err) {
                    console.error('Error starting philosophy session:', err);
                }
            } else if (!isConnected && currentSession) {
                // 结束会话
                try {
                    const peerCount = Object.keys(peers).length + 1;
                    await philosophyService.endPhilosophySession(currentSession.id, peerCount);
                    setCurrentSession(null);
                } catch (err) {
                    console.error('Error ending philosophy session:', err);
                }
            }
        };
        
        handleConnectionChange();
    }, [isConnected, userId, philosophySettings, mode, currentSession, peers, philosophyService]);

    const peerCount = Object.keys(peers).length + (isConnected ? 1 : 0);

    const toggleConnection = () => {
        if (isConnected) {
            leaveRoom();
        } else {
            joinRoom('philosophy-demo');
        }
    };

    const sendTestPulse = () => {
        if (!currentSession) return;
        
        broadcast({
            type: 'pulse',
            userId,
            intensity: 'good'
        });
        
        // 记录脉冲
        philosophyService.recordPhilosophyPulse(
            currentSession.id,
            userId,
            'good'
        ).catch(err => {
            console.error('Error recording philosophy pulse:', err);
        });
    };

    const handleModeChange = async (newMode: 'campfire' | 'starry') => {
        setMode(newMode);
        
        if (userId && philosophySettings) {
            try {
                await philosophyService.upsertPhilosophySettings(userId, {
                    preferred_mode: newMode
                });
            } catch (err) {
                console.error('Error updating philosophy settings:', err);
            }
        }
    };

    // 显示加载状态
    if (isLoading) {
        return (
            <div className="relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/70">加载中...</p>
                </div>
            </div>
        );
    }

    // 显示错误状态
    if (error) {
        return (
            <div className="relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-4 py-2 bg-white/10 text-white rounded-md"
                    >
                        重试
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative min-h-screen w-full overflow-hidden mode-transition ${mode === 'campfire' ? 'campfire-mode' : 'starry-mode'}`}>
            {/* Philosophy Background - 确保始终渲染一个背景 */}
            {mode === 'campfire' ? <CampfireCanvas /> : <StarryNightCanvasSimple />}
            
            {/* Subtle overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none fade-transition" style={{ zIndex: 0 }} />

            {/* Main Content - 使用更高的z-index确保可见性 */}
            <div className="relative flex min-h-screen flex-col items-center justify-center p-8" style={{ zIndex: 1 }}>

                {/* Hero Section */}
                <div className="text-center space-y-6 mb-12 fade-transition">
                    <h1 className="text-6xl md:text-8xl font-light text-white tracking-wide text-shadow-soft animate-fade-in">
                        陪伴，但不打扰
                    </h1>
                    <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto font-light text-shadow-soft animate-fade-in" style={{ animationDelay: '0.3s' }}>
                        在温暖的篝火旁，或静谧的星空下
                        <br />
                        与同伴一起学习，感受温柔的陪伴
                    </p>
                </div>

                {/* Mode Switcher - 更柔和的过渡效果 */}
                <div className="flex gap-4 mb-8">
                    <div className="relative">
                        <Button
                            size="lg"
                            variant="ghost"
                            onClick={() => handleModeChange('campfire')}
                            className={`
                text-lg px-8 py-6 rounded-2xl transition-all duration-700 ease-in-out
                ${mode === 'campfire'
                                    ? 'bg-white/15 backdrop-blur-md text-white border border-white/20 shadow-lg scale-105'
                                    : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 border border-transparent'
                                }
                            `}
                        >
                            <Flame className={`mr-2 h-6 w-6 transition-all duration-700 ${mode === 'campfire' ? 'text-orange-400' : 'text-white/40'}`} />
                            <span className="relative z-10">篝火</span>
                            {mode === 'campfire' && (
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/20 to-red-500/20 animate-pulse" />
                            )}
                        </Button>
                    </div>

                    <div className="relative">
                        <Button
                            size="lg"
                            variant="ghost"
                            onClick={() => handleModeChange('starry')}
                            className={`
                text-lg px-8 py-6 rounded-2xl transition-all duration-700 ease-in-out
                ${mode === 'starry'
                                    ? 'bg-white/15 backdrop-blur-md text-white border border-white/20 shadow-lg scale-105'
                                    : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 border border-transparent'
                                }
                            `}
                        >
                            <Sparkles className={`mr-2 h-6 w-6 transition-all duration-700 ${mode === 'starry' ? 'text-blue-400' : 'text-white/40'}`} />
                            <span className="relative z-10">星空</span>
                            {mode === 'starry' && (
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Connection Status - 更柔和的存在感 */}
                <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="relative group">
                        <Button
                            size="lg"
                            onClick={toggleConnection}
                            className={`
                text-lg px-8 py-6 rounded-full transition-all duration-500 ease-in-out
                ${isConnected
                                    ? 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/15'
                                    : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 border border-transparent'
                                }
                            `}
                        >
                            <div className="relative flex items-center">
                                {isConnected ? (
                                    <>
                                        <Wifi className="mr-2 h-5 w-5 text-green-400" />
                                        <span className="font-light">一同学习</span>
                                    </>
                                ) : (
                                    <>
                                        <WifiOff className="mr-2 h-5 w-5" />
                                        <span className="font-light">开始陪伴</span>
                                    </>
                                )}
                            </div>
                        </Button>
                        
                        {/* 柔和的连接指示器 */}
                        {isConnected && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-400 animate-pulse" />
                        )}
                    </div>

                    {isConnected && (
                        <div className="flex items-center gap-2 text-white/60 text-sm font-light animate-fade-in">
                            <Users className="h-4 w-4" />
                            <span>{peerCount} 位学习者</span>
                        </div>
                    )}
                </div>

                {/* Test Pulse Button - 更含蓄的交互 */}
                {isConnected && (
                    <div className="group relative">
                        <Button
                            onClick={sendTestPulse}
                            variant="ghost"
                            className="
                text-lg px-6 py-3 rounded-full
                text-white/60 hover:text-white/80 font-light
                transition-all duration-500 hover:scale-105
                border border-white/10 hover:border-white/20
                backdrop-blur-sm
              "
                        >
                            <span className="mr-2">⚡</span>
                            <span>传递能量</span>
                        </Button>
                        
                        {/* 悬停提示 */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/80 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                            向同伴发送学习脉冲
                        </div>
                    </div>
                )}

                {/* Debug toggle (only in development) */}
                {import.meta.env.DEV && (
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className="
              absolute bottom-4 right-4
              text-xs px-3 py-2 rounded-full
              bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 backdrop-blur-sm
              border border-white/10 hover:border-white/20
              transition-all duration-300
            "
                    >
                        🐛
                    </button>
                )}

                {/* Feature Cards - 更含蓄的展示 */}
                <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-5xl">
                    <div className="
            p-6 rounded-2xl 
            bg-white/5 backdrop-blur-md 
            border border-white/5
            hover:bg-white/10 hover:border-white/10
            transition-all duration-500 hover:transform hover:scale-105
            text-center group
          ">
                        <div className="text-4xl mb-4 opacity-70 group-hover:opacity-100 transition-opacity duration-500">🔥</div>
                        <h3 className="text-lg font-light text-white mb-2">篝火围坐</h3>
                        <p className="text-white/60 text-sm font-light">温暖的火焰旁，我们化作光点静静相伴</p>
                    </div>
                    
                    <div className="
            p-6 rounded-2xl 
            bg-white/5 backdrop-blur-md 
            border border-white/5
            hover:bg-white/10 hover:border-white/10
            transition-all duration-500 hover:transform hover:scale-105
            text-center group
          ">
                        <div className="text-4xl mb-4 opacity-70 group-hover:opacity-100 transition-opacity duration-500">💫</div>
                        <h3 className="text-lg font-light text-white mb-2">实时脉冲</h3>
                        <p className="text-white/60 text-sm font-light">每个努力的瞬间，都有人默默感知</p>
                    </div>
                    
                    <div className="
            p-6 rounded-2xl 
            bg-white/5 backdrop-blur-md 
            border border-white/5
            hover:bg-white/10 hover:border-white/10
            transition-all duration-500 hover:transform hover:scale-105
            text-center group
          ">
                        <div className="text-4xl mb-4 opacity-70 group-hover:opacity-100 transition-opacity duration-500">✨</div>
                        <h3 className="text-lg font-light text-white mb-2">星空成长</h3>
                        <p className="text-white/60 text-sm font-light">每次学习点亮一颗星，汇成璀璨星河</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <div className="
      p-6 rounded-2xl 
      bg-white/5 backdrop-blur-md 
      border border-white/10
      hover:bg-white/10 hover:border-white/20
      transition-all duration-300
      text-center
    ">
            <div className="text-5xl mb-4">{icon}</div>
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-white/70">{description}</p>
        </div>
    );
}
