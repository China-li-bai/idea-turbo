/**
 * Focus Timer Component (Standalone)
 * 
 * Simplified focus timer with local state only.
 * No global state, no complex sync logic.
 */

import { useState, useEffect, useRef } from 'react';
import { useStudyRoom } from '@/contexts/StudyRoomContext';
import { Button } from '@/components/ui/button';
import { Play, Square, Timer } from 'lucide-react';
import { cn } from '@make-gold/lib/utils';

export function FocusTimer() {
    const { isConnected, broadcast } = useStudyRoom();
    const [isActive, setIsActive] = useState(false);
    const [duration] = useState(25); // minutes
    const [remaining, setRemaining] = useState(25 * 60); // seconds
    const [showControls, setShowControls] = useState(false);
    const startTimeRef = useRef<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isActive && startTimeRef.current) {
            timerRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
                const newRemaining = Math.max(0, duration * 60 - elapsed);
                setRemaining(newRemaining);

                if (newRemaining === 0) {
                    setIsActive(false);
                    if (timerRef.current) clearInterval(timerRef.current);
                }
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, duration]);

    const handleStart = () => {
        startTimeRef.current = Date.now();
        setIsActive(true);
        setRemaining(duration * 60);

        // Broadcast to peers
        if (isConnected) {
            broadcast({
                type: 'focus-sync',
                userId: 'self',
                action: 'start',
                duration: duration,
                remaining: duration * 60
            } as any);
        }
    };

    const handleStop = () => {
        setIsActive(false);
        startTimeRef.current = null;
        setRemaining(duration * 60);

        // Broadcast to peers
        if (isConnected) {
            broadcast({
                type: 'focus-sync',
                userId: 'self',
                action: 'complete',
                duration: duration
            } as any);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = isActive
        ? ((duration * 60 - remaining) / (duration * 60)) * 100
        : 0;

    if (!isConnected) return null;

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
            <div
                className={cn(
                    "relative flex items-center gap-3 px-4 py-2 rounded-full shadow-lg backdrop-blur-md border transition-all",
                    isActive
                        ? "bg-primary/90 text-primary-foreground border-primary/50"
                        : "bg-background/80 border-border hover:bg-background"
                )}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => setShowControls(false)}
            >
                {isActive && (
                    <div
                        className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                    />
                )}

                <Timer className={cn("h-4 w-4 relative z-10", isActive && "animate-pulse")} />

                <span className="font-mono text-lg font-bold tabular-nums relative z-10">
                    {formatTime(remaining)}
                </span>

                {(showControls || !isActive) && (
                    <div className="flex items-center gap-1 ml-2 relative z-10">
                        {!isActive ? (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded-full"
                                onClick={handleStart}
                            >
                                <Play className="h-3 w-3" />
                            </Button>
                        ) : (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded-full"
                                onClick={handleStop}
                            >
                                <Square className="h-3 w-3 fill-current" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
