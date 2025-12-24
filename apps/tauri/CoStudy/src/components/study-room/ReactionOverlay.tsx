/**
 * Reaction Overlay Component
 * 
 * Displays floating emoji reactions from peers.
 */

import { useEffect, useState } from 'react';
import { useStudyRoom } from '@/contexts/StudyRoomContext';
import type { ReactionMessage } from '@make-gold/lib/schema';

interface FloatingReaction {
    id: string;
    emoji: string;
    x: number;
    y: number;
}

export function ReactionOverlay() {
    const { recentMessages } = useStudyRoom();
    const [reactions, setReactions] = useState<FloatingReaction[]>([]);

    useEffect(() => {
        if (recentMessages.length === 0) return;

        const lastMsg = recentMessages[0];
        if (lastMsg.type === 'reaction') {
            const rMsg = lastMsg as ReactionMessage;

            // Create floating reaction at random position
            const reaction: FloatingReaction = {
                id: Math.random().toString(36).substr(2, 9),
                emoji: rMsg.emoji,
                x: Math.random() * 80 + 10, // 10-90% from left
                y: Math.random() * 40 + 30, // 30-70% from top
            };

            setReactions(prev => [...prev, reaction]);

            // Remove after animation completes
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== reaction.id));
            }, 3000);
        }
    }, [recentMessages]);

    return (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
            {reactions.map(reaction => (
                <div
                    key={reaction.id}
                    className="absolute text-6xl animate-float-up opacity-0"
                    style={{
                        left: `${reaction.x}%`,
                        top: `${reaction.y}%`,
                        animation: 'float-up 3s ease-out forwards'
                    }}
                >
                    {reaction.emoji}
                </div>
            ))}

            <style>{`
        @keyframes float-up {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.5);
          }
          10% {
            opacity: 1;
            transform: translateY(-20px) scale(1);
          }
          90% {
            opacity: 1;
            transform: translateY(-200px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-250px) scale(1.5);
          }
        }
      `}</style>
        </div>
    );
}
