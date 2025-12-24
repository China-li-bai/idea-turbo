/**
 * Study Room Component
 * 
 * Main container for the Parallel Study Space UI.
 */

import { useEffect, useState } from 'react';
import { useStudyRoom } from '@/contexts/StudyRoomContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { PulseAnimation } from './PulseAnimation';
import { PeerAvatars } from './PeerAvatars';
import { FocusTimer } from './FocusTimer';
import { HighlightToast } from './HighlightToast';
import { ReactionOverlay } from './ReactionOverlay';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Wifi, WifiOff, Zap } from 'lucide-react';
import { cn } from '@make-gold/lib/utils';

export function StudyRoom() {
    const { isConnected, joinRoom, leaveRoom, broadcast, roomId } = useStudyRoom();
    const { profile, userId } = useUserProfile();
    const [isHovering, setIsHovering] = useState(false);

    // Auto-join a default room for now (or could be passed as prop)
    // In a real app, user might choose a room
    const DEFAULT_ROOM = 'public-study-lounge';

    const toggleConnection = () => {
        if (isConnected) {
            leaveRoom();
        } else {
            joinRoom(DEFAULT_ROOM);
        }
    };

    // Test pulse button
    const handleTestPulse = () => {
        broadcast({
            type: 'pulse',
            userId,
            intensity: 'good'
        });
    };

    return (
        <>
            <PulseAnimation />
            <FocusTimer />
            <HighlightToast />
            <ReactionOverlay />

            <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
                {/* Connection Status & Controls */}
                <div
                    className="flex items-center gap-2"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    {isConnected && <PeerAvatars />}

                    <Button
                        variant={isConnected ? "outline" : "default"}
                        size="icon"
                        className={cn(
                            "rounded-full h-12 w-12 shadow-lg transition-all duration-300",
                            isConnected ? "bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive" : "bg-primary hover:bg-primary/90"
                        )}
                        onClick={toggleConnection}
                        title={isConnected ? "断开连接" : "加入自习室"}
                    >
                        {isConnected ? (
                            isHovering ? <WifiOff className="h-5 w-5" /> : <Wifi className="h-5 w-5 text-green-500" />
                        ) : (
                            <WifiOff className="h-5 w-5" />
                        )}
                    </Button>
                </div>

                {/* Debug/Test Controls (Only visible when connected) */}
                {isConnected && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground opacity-50 hover:opacity-100"
                        onClick={handleTestPulse}
                    >
                        <Zap className="h-3 w-3 mr-1" />
                        发送脉冲
                    </Button>
                )}
            </div>
        </>
    );
}
