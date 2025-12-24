/**
 * Study Room Context (Simplified)
 * 
 * Directly uses Trystero without service layer.
 * Follows Linus philosophy: Keep it simple and focused.
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { joinRoom } from 'trystero/torrent';
import type { Room, ActionSender } from 'trystero';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getUnifiedDataAccess } from '@/services/UnifiedDataAccess';
import { activityPulses } from '@make-gold/lib/study-session-data-access';
import type {
    P2PMessage,
    PulseMessage,
    FocusSyncMessage,
    PresenceMessage,
    ReactionMessage
} from '@make-gold/lib/schema';

// Configuration
const APP_ID = 'make-gold-study-space-v1';

interface PeerState {
    id: string;
    displayName: string;
    avatarColor: string;
    lastSeen: number;
    status: 'active' | 'idle';
}

interface StudyRoomState {
    isConnected: boolean;
    roomId: string | null;
    peers: Record<string, PeerState>;
    recentMessages: P2PMessage[];
}

interface StudyRoomActions {
    joinRoom: (roomId: string) => void;
    leaveRoom: () => void;
    broadcast: (message: Omit<P2PMessage, 'timestamp'>) => void;
}

type StudyRoomContextType = StudyRoomState & StudyRoomActions;

const StudyRoomContext = createContext<StudyRoomContextType | undefined>(undefined);

export function StudyRoomProvider({ children }: { children: ReactNode }) {
    const { profile, userId } = useUserProfile();
    
    // Single state object for all room state
    const [state, setState] = useState<StudyRoomState>({
        isConnected: false,
        roomId: null,
        peers: {},
        recentMessages: [],
    });

    // Direct Trystero references
    const roomRef = useRef<Room | null>(null);
    const sendPulseRef = useRef<ActionSender<PulseMessage> | null>(null);
    const sendFocusRef = useRef<ActionSender<FocusSyncMessage> | null>(null);
    const sendPresenceRef = useRef<ActionSender<PresenceMessage> | null>(null);
    const sendReactionRef = useRef<ActionSender<ReactionMessage> | null>(null);

    // Unified message handler
    const handleMessage = useCallback((data: any, peerId: string) => {
        const message = {
            ...data,
            userId: data.userId || peerId,
            timestamp: data.timestamp || Date.now()
        } as P2PMessage;

        setState(prev => ({
            ...prev,
            recentMessages: [message, ...prev.recentMessages].slice(0, 50)
        }));

        // Handle presence updates
        if (message.type === 'presence') {
            const pMsg = message as PresenceMessage;
            if (pMsg.status === 'active' || pMsg.status === 'idle') {
                setState(prev => ({
                    ...prev,
                    peers: {
                        ...prev.peers,
                        [pMsg.userId]: {
                            id: pMsg.userId,
                            displayName: pMsg.displayName,
                            avatarColor: pMsg.avatarColor,
                            lastSeen: Date.now(),
                            status: pMsg.status as 'active' | 'idle',
                        }
                    }
                }));
            }
        }
    }, []);

    // Join room function
    const joinRoom = useCallback((newRoomId: string) => {
        if (roomRef.current) {
            leaveRoom();
        }

        setState(prev => ({
            ...prev,
            roomId: newRoomId,
            isConnected: true,
            peers: {},
            recentMessages: []
        }));

        console.log(`🔌 Joining P2P room: ${newRoomId}`);

        // Initialize Trystero room
        const room = joinRoom({ appId: APP_ID }, newRoomId);
        roomRef.current = room;

        // Setup event listeners
        room.onPeerJoin((peerId) => {
            console.log(`👋 Peer joined: ${peerId}`);
            // Send presence when peer joins
            if (profile) {
                setTimeout(() => {
                    sendPresenceRef.current?.({
                        userId,
                        status: 'active',
                        displayName: profile.display_name,
                        avatarColor: profile.avatar_color || '#ccc',
                    });
                }, 1000);
            }
        });

        room.onPeerLeave((peerId) => {
            console.log(`👋 Peer left: ${peerId}`);
            setState(prev => {
                const next = { ...prev };
                delete next.peers[peerId];
                return next;
            });
        });

        // Setup actions (message channels)
        const [sendPulse, getPulse] = room.makeAction<any>('pulse');
        const [sendFocus, getFocus] = room.makeAction<any>('focus');
        const [sendPresence, getPresence] = room.makeAction<any>('presence');
        const [sendReaction, getReaction] = room.makeAction<any>('reaction');

        sendPulseRef.current = sendPulse;
        sendFocusRef.current = sendFocus;
        sendPresenceRef.current = sendPresence;
        sendReactionRef.current = sendReaction;

        // Setup message receivers
        getPulse((data, peerId) => handleMessage(data, peerId));
        getFocus((data, peerId) => handleMessage(data, peerId));
        getPresence((data, peerId) => handleMessage(data, peerId));
        getReaction((data, peerId) => handleMessage(data, peerId));

        // Initial presence broadcast
        if (profile) {
            setTimeout(() => {
                sendPresence({
                    userId,
                    status: 'active',
                    displayName: profile.display_name,
                    avatarColor: profile.avatar_color || '#ccc',
                });
            }, 1000);
        }
    }, [profile, userId, handleMessage]);

    // Leave room function
    const leaveRoom = useCallback(() => {
        if (roomRef.current) {
            console.log(`🔌 Leaving P2P room: ${state.roomId}`);
            roomRef.current.leave();
            roomRef.current = null;
            
            sendPulseRef.current = null;
            sendFocusRef.current = null;
            sendPresenceRef.current = null;
            sendReactionRef.current = null;

            setState(prev => ({
                ...prev,
                roomId: null,
                isConnected: false,
                peers: {},
                recentMessages: []
            }));
        }
    }, [state.roomId]);

    // Unified broadcast function
    const broadcast = useCallback((message: Omit<P2PMessage, 'timestamp'>) => {
        if (!state.isConnected || !state.roomId) return;

        const fullMessage = {
            ...message,
            timestamp: Date.now()
        } as P2PMessage;

        // Directly call appropriate sender based on message type
        switch (message.type) {
            case 'pulse':
                const pulseMsg = fullMessage as PulseMessage;
                sendPulseRef.current?.(pulseMsg);
                
                // Persist pulse locally if we are in a session
                if (pulseMsg.sessionId) {
                    const dataAccess = getUnifiedDataAccess();
                    dataAccess.executeLocal(async (db) => {
                        await activityPulses.create(
                            db,
                            pulseMsg.sessionId!,
                            'card_review',
                            pulseMsg.intensity,
                            pulseMsg.cardId,
                            pulseMsg.value
                        );
                    }).catch(err => console.error('Failed to persist pulse:', err));
                }
                break;
                
            case 'focus-sync':
                sendFocusRef.current?.(fullMessage as FocusSyncMessage);
                break;
                
            case 'presence':
                sendPresenceRef.current?.(fullMessage as PresenceMessage);
                break;
                
            case 'reaction':
                sendReactionRef.current?.(fullMessage as ReactionMessage);
                break;
        }
    }, [state.isConnected, state.roomId]);

    // Periodic presence heartbeat
    useEffect(() => {
        if (!state.isConnected || !profile) return;

        const interval = setInterval(() => {
            sendPresenceRef.current?.({
                userId,
                status: 'active',
                displayName: profile.display_name,
                avatarColor: profile.avatar_color || '#ccc',
            });
        }, 30000); // Every 30s

        return () => clearInterval(interval);
    }, [state.isConnected, profile, userId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            leaveRoom();
        };
    }, [leaveRoom]);

    const contextValue: StudyRoomContextType = {
        ...state,
        joinRoom,
        leaveRoom,
        broadcast,
    };

    return (
        <StudyRoomContext.Provider value={contextValue}>
            {children}
        </StudyRoomContext.Provider>
    );
}

export function useStudyRoom() {
    const context = useContext(StudyRoomContext);
    if (context === undefined) {
        throw new Error('useStudyRoom must be used within a StudyRoomProvider');
    }
    return context;
}