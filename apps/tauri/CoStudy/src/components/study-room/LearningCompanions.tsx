/**
 * Learning Companions - 学习同伴显示
 * 
 * 显示当前学习房间的其他学习者，提供陪伴感
 */

import { useState } from 'react';
import { useStudyRoom } from '@/contexts/StudyRoomContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Users, Sparkles, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LearningCompanionsProps {
    className?: string;
    showMinimal?: boolean;
}

export function LearningCompanions({ className, showMinimal = false }: LearningCompanionsProps) {
    const { peers, isConnected } = useStudyRoom();
    const { userId } = useUserProfile();
    const [expanded, setExpanded] = useState(false);
    
    const peerCount = Object.keys(peers).length;
    const totalLearners = peerCount + (isConnected ? 1 : 0);
    
    // 如果没有连接或没有其他学习者，显示提示
    if (!isConnected || totalLearners <= 1) {
        return (
            <div className={`${className}`}>
                {showMinimal ? (
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2 bg-white/5">
                        <Users className="h-3 w-3 mr-1" />
                        单独学习
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 text-xs text-white/60 bg-white/5 rounded-full px-3 py-1">
                        <Users className="h-3 w-3" />
                        单独学习中
                    </div>
                )}
            </div>
        );
    }
    
    if (showMinimal) {
        return (
            <div className={className}>
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2 bg-white/10 hover:bg-white/15">
                    <Users className="h-3 w-3 mr-1" />
                    {totalLearners} 人
                </Button>
            </div>
        );
    }
    
    return (
        <div className={`${className}`}>
            <div className="relative group">
                {/* 简洁版本 */}
                <div 
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2 text-xs text-white/80 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 cursor-pointer hover:bg-white/15 transition-all"
                >
                    <Users className="h-3 w-3" />
                    <span>{totalLearners} 位学习者</span>
                    
                    {/* 活跃指示器 */}
                    {peerCount > 0 && (
                        <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                </div>
                
                {/* 展开版本 */}
                {expanded && (
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-lg p-4 shadow-xl border border-white/20">
                        <div className="text-sm font-medium mb-3 text-center">
                            正在学习的朋友们
                        </div>
                        
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {/* 自己 */}
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                    我
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium">你</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">正在复习卡片</div>
                                </div>
                            </div>
                            
                            {/* 其他学习者 */}
                            {Object.values(peers).map(peer => (
                                <div key={peer.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div 
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                                        style={{ backgroundColor: peer.avatarColor }}
                                    >
                                        {peer.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">{peer.name || '匿名学习者'}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">也在学习中</div>
                                    </div>
                                    
                                    {/* 活跃指示器 */}
                                    <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                                </div>
                            ))}
                        </div>
                        
                        {/* 底部信息 */}
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-center text-slate-500 dark:text-slate-400">
                            <div className="flex items-center justify-center gap-1">
                                <Flame className="h-3 w-3" />
                                <span>一起努力，共同进步</span>
                                <Sparkles className="h-3 w-3" />
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 点击外部关闭 */}
                {expanded && (
                    <div 
                        className="fixed inset-0 -z-10" 
                        onClick={() => setExpanded(false)}
                    />
                )}
            </div>
        </div>
    );
}