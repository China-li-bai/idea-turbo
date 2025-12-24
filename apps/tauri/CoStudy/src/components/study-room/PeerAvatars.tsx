/**
 * Peer Avatars Component
 * 
 * Displays connected peers in the study room.
 */

import { useStudyRoom } from '@/contexts/StudyRoomContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@make-gold/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function PeerAvatars() {
    const { peers, isConnected } = useStudyRoom();
    const { profile } = useUserProfile();

    if (!isConnected) return null;

    const peerList = Object.values(peers);

    return (
        <div className="flex items-center gap-2 p-2 bg-background/80 backdrop-blur-sm rounded-full border shadow-sm">
            <div className="flex -space-x-2 overflow-hidden">
                {/* Self */}
                {profile && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Avatar className="inline-block h-8 w-8 ring-2 ring-background cursor-default">
                                    <AvatarImage src={profile.avatar_url || undefined} />
                                    <AvatarFallback style={{ backgroundColor: profile.avatar_color || '#ccc' }}>
                                        {profile.display_name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>我 ({profile.display_name})</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

                {/* Peers */}
                {peerList.map(peer => (
                    <TooltipProvider key={peer.id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Avatar className={cn(
                                    "inline-block h-8 w-8 ring-2 ring-background cursor-default transition-transform hover:scale-110 hover:z-10",
                                    peer.status === 'active' ? "ring-green-500/50" : "opacity-70"
                                )}>
                                    <AvatarFallback style={{ backgroundColor: peer.avatarColor }}>
                                        {peer.displayName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{peer.displayName} {peer.status === 'idle' && '(离开)'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </div>

            <div className="text-xs text-muted-foreground px-2">
                {peerList.length + 1} 人在学习
            </div>
        </div>
    );
}
