/**
 * Pulse Animation Component
 * 
 * Visualizes study activity pulses from peers.
 */

import { useEffect, useState } from 'react';
import { cn } from '@make-gold/lib/utils';
import { useStudyRoom } from '@/contexts/StudyRoomContext';
import type { PulseIntensity } from '@make-gold/lib/schema';

interface PulseProps {
    intensity: PulseIntensity;
    color: string;
    onComplete: () => void;
}

function Pulse({ intensity, color, onComplete }: PulseProps) {
    useEffect(() => {
        const timer = setTimeout(onComplete, 2000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    const sizeClasses = {
        again: 'w-16 h-16',
        hard: 'w-20 h-20',
        good: 'w-24 h-24',
        easy: 'w-32 h-32',
    };

    const durationClasses = {
        again: 'duration-1000',
        hard: 'duration-1500',
        good: 'duration-2000',
        easy: 'duration-2000',
    };

    return (
        <div
            className={cn(
                "absolute rounded-full opacity-0 animate-ping",
                sizeClasses[intensity],
                durationClasses[intensity]
            )}
            style={{ backgroundColor: color }}
        />
    );
}

export function PulseAnimation() {
    const { recentMessages, peers } = useStudyRoom();
    const [activePulses, setActivePulses] = useState<{ id: string, intensity: PulseIntensity, userId: string }[]>([]);

    useEffect(() => {
        if (recentMessages.length === 0) return;

        const lastMsg = recentMessages[0];
        if (lastMsg.type === 'pulse') {
            // Add new pulse
            const pulseId = Math.random().toString(36).substr(2, 9);
            setActivePulses(prev => [...prev, {
                id: pulseId,
                intensity: (lastMsg as any).intensity,
                userId: lastMsg.userId
            }]);
        }
    }, [recentMessages]);

    const removePulse = (id: string) => {
        setActivePulses(prev => prev.filter(p => p.id !== id));
    };

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
            {activePulses.map(pulse => {
                const peer = peers[pulse.userId];
                // If peer not found (e.g. self or just joined), use default color
                const color = peer?.avatarColor || '#4ECDC4';

                // Random position for now, or could be based on peer avatar position
                // For "room" feel, let's center it but with some offset
                const top = `${50 + (Math.random() * 40 - 20)}%`;
                const left = `${50 + (Math.random() * 40 - 20)}%`;

                return (
                    <div
                        key={pulse.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ top, left }}
                    >
                        <Pulse
                            intensity={pulse.intensity}
                            color={color}
                            onComplete={() => removePulse(pulse.id)}
                        />
                    </div>
                );
            })}
        </div>
    );
}
