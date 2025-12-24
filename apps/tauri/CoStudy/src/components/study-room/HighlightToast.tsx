/**
 * Highlight Toast Component
 * 
 * Displays achievement notifications from peers.
 */

import { useEffect, useState } from 'react';
import { useStudyRoom } from '@/contexts/StudyRoomContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@make-gold/lib/utils';
import { Trophy, Flame, Target, Zap } from 'lucide-react';

interface Highlight {
    id: string;
    userId: string;
    displayName: string;
    avatarColor: string;
    message: string;
    timestamp: number;
}

export function HighlightToast() {
    const { recentMessages, peers, broadcast } = useStudyRoom();
    const { userId } = useUserProfile();
    const [highlights, setHighlights] = useState<Highlight[]>([]);

    useEffect(() => {
        if (recentMessages.length === 0) return;

        const lastMsg = recentMessages[0];

        // Check for progress milestones (simplified - would normally track in session data)
        if (lastMsg.type === 'progress') {
            const pMsg = lastMsg as any;
            const peer = peers[pMsg.userId];

            if (pMsg.cardsReviewed && pMsg.cardsReviewed % 25 === 0 && pMsg.cardsReviewed > 0) {
                const highlight: Highlight = {
                    id: Math.random().toString(36).substr(2, 9),
                    userId: pMsg.userId,
                    displayName: peer?.displayName || '学习者',
                    avatarColor: peer?.avatarColor || '#4ECDC4',
                    message: `刚刚达成了 ${pMsg.cardsReviewed} 张复习！`,
                    timestamp: Date.now()
                };

                setHighlights(prev => [highlight, ...prev].slice(0, 3)); // Keep last 3

                // Auto-remove after 5s
                setTimeout(() => {
                    setHighlights(prev => prev.filter(h => h.id !== highlight.id));
                }, 5000);
            }
        }
    }, [recentMessages, peers]);

    const handleReact = (targetUserId: string, emoji: '👏' | '🔥' | '💪' | '🎉') => {
        broadcast({
            type: 'reaction',
            userId,
            targetUserId,
            emoji
        });
    };

    if (highlights.length === 0) return null;

    return (
        <div className="fixed top-20 right-6 z-50 flex flex-col gap-2 max-w-xs">
            {highlights.map(highlight => (
                <div
                    key={highlight.id}
                    className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-md text-white p-4 rounded-lg shadow-xl border border-white/20 animate-in slide-in-from-right-5 fade-in"
                >
                    <div className="flex items-start gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ring-2 ring-white/30"
                            style={{ backgroundColor: highlight.avatarColor }}
                        >
                            {highlight.displayName.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Trophy className="h-4 w-4" />
                                <span className="font-semibold text-sm">{highlight.displayName}</span>
                            </div>
                            <p className="text-sm">{highlight.message}</p>

                            {/* Quick Reactions */}
                            <div className="flex gap-1 mt-2">
                                {(['👏', '🔥', '💪', '🎉'] as const).map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleReact(highlight.userId, emoji)}
                                        className="text-lg hover:scale-125 transition-transform active:scale-95 opacity-70 hover:opacity-100"
                                        title={`发送 ${emoji}`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
