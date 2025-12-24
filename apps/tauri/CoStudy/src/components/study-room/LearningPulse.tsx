/**
 * Learning Pulse - 学习脉冲组件
 * 
 * 当用户完成卡片复习时，显示脉冲效果，传递给其他学习者
 */

import { useEffect, useState } from 'react';
import { useStudyRoom } from '@/contexts/StudyRoomContext';
import { useUserProfile } from '@/hooks/useUserProfile';

interface LearningPulseProps {
    cardId: string;
    rating: 'again' | 'hard' | 'good' | 'easy';
    isActive: boolean;
}

export function LearningPulse({ cardId, rating, isActive }: LearningPulseProps) {
    const { broadcast } = useStudyRoom();
    const { userId } = useUserProfile();
    const [pulseAnimation, setPulseAnimation] = useState(false);

    // 发送脉冲到学习房间
    useEffect(() => {
        if (isActive && userId) {
            // 显示本地脉冲动画
            setPulseAnimation(true);
            setTimeout(() => setPulseAnimation(false), 1500);

            // 发送脉冲到其他学习者
            broadcast({
                type: 'pulse',
                userId,
                intensity: rating,
                cardId
            });
        }
    }, [isActive, userId, cardId, rating, broadcast]);

    if (!isActive) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
            {/* 脉冲波纹效果 */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div 
                    className={`
                        absolute w-32 h-32 rounded-full border-2 border-white/20
                        animate-ping
                        ${pulseAnimation ? 'opacity-100' : 'opacity-0'}
                    `}
                />
            </div>
            
            {/* 中心点 */}
            <div 
                className={`
                    absolute w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm
                    flex items-center justify-center
                    transform transition-all duration-500
                    ${pulseAnimation ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
                `}
            >
                <div className="text-white text-sm font-medium">
                    {rating === 'again' && '💪'}
                    {rating === 'hard' && '🧠'}
                    {rating === 'good' && '✨'}
                    {rating === 'easy' && '⭐'}
                </div>
            </div>
        </div>
    );
}