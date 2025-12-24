/**
 * Study Room Service
 * 
 * Manages P2P connections using Trystero (BitTorrent/MQTT).
 * Handles message broadcasting and receiving for the Parallel Study Space.
 */

import { joinRoom } from 'trystero/torrent';
import type { Room, ActionSender } from 'trystero';
import type {
    P2PMessage,
    PulseMessage,
    FocusSyncMessage,
    PresenceMessage,
    ReactionMessage
} from '@make-gold/lib/schema';
import { getUnifiedDataAccess } from './UnifiedDataAccess';
import { activityPulses } from '@make-gold/lib/study-session-data-access';

// Configuration
const APP_ID = 'make-gold-study-space-v1';

export type StudyRoomEvents = {
    onMessage: (message: P2PMessage) => void;
    onPeerJoin: (peerId: string) => void;
    onPeerLeave: (peerId: string) => void;
};

export class StudyRoomService {
    private room: Room | null = null;
    private roomId: string | null = null;
    private localPeerId: string | null = null;
    private events: StudyRoomEvents;

    // Action senders
    private sendPulseAction: ActionSender<PulseMessage> | null = null;
    private sendFocusAction: ActionSender<FocusSyncMessage> | null = null;
    private sendPresenceAction: ActionSender<PresenceMessage> | null = null;
    private sendReactionAction: ActionSender<ReactionMessage> | null = null;

    constructor(events: StudyRoomEvents) {
        this.events = events;
    }

    /**
     * Join a study room
     */
    join(roomId: string) {
        if (this.room) {
            this.leave();
        }

        this.roomId = roomId;
        console.log(`🔌 Joining P2P room: ${roomId}`);

        // Initialize Trystero room
        this.room = joinRoom({ appId: APP_ID }, roomId);

        // Get local peer ID (Trystero generates this)
        // Trystero doesn't expose local ID directly in a simple way, but we can use a self-generated one if needed
        // or just rely on the fact that we are 'self'
        this.localPeerId = 'self';

        // Setup event listeners
        this.room.onPeerJoin((peerId) => {
            console.log(`👋 Peer joined: ${peerId}`);
            this.events.onPeerJoin(peerId);
        });

        this.room.onPeerLeave((peerId) => {
            console.log(`👋 Peer left: ${peerId}`);
            this.events.onPeerLeave(peerId);
        });

        // Setup actions (message channels)
        // We cast to any to avoid strict DataPayload constraint issues with specific interfaces
        const [sendPulse, getPulse] = this.room.makeAction<any>('pulse');
        const [sendFocus, getFocus] = this.room.makeAction<any>('focus');
        const [sendPresence, getPresence] = this.room.makeAction<any>('presence');
        const [sendReaction, getReaction] = this.room.makeAction<any>('reaction');

        this.sendPulseAction = sendPulse;
        this.sendFocusAction = sendFocus;
        this.sendPresenceAction = sendPresence;
        this.sendReactionAction = sendReaction;

        // Setup message receivers
        getPulse((data, peerId) => this.handleMessage(data, peerId));
        getFocus((data, peerId) => this.handleMessage(data, peerId));
        getPresence((data, peerId) => this.handleMessage(data, peerId));
        getReaction((data, peerId) => this.handleMessage(data, peerId));

        return this.room;
    }

    /**
     * Leave the current room
     */
    leave() {
        if (this.room) {
            console.log(`🔌 Leaving P2P room: ${this.roomId}`);
            this.room.leave();
            this.room = null;
            this.roomId = null;
            this.localPeerId = null;

            this.sendPulseAction = null;
            this.sendFocusAction = null;
            this.sendPresenceAction = null;
            this.sendReactionAction = null;
        }
    }

    /**
     * Broadcast a pulse (study activity)
     */
    broadcastPulse(message: Omit<PulseMessage, 'type' | 'timestamp'>) {
        if (!this.sendPulseAction) return;

        const fullMessage: PulseMessage = {
            ...message,
            type: 'pulse',
            timestamp: Date.now(),
        };

        this.sendPulseAction(fullMessage);

        // Persist pulse locally if we are in a session
        if (message.sessionId) {
            const dataAccess = getUnifiedDataAccess();
            dataAccess.executeLocal(async (db) => {
                await activityPulses.create(
                    db,
                    message.sessionId!,
                    'card_review', // Default to card review for now, can be refined
                    message.intensity,
                    message.cardId,
                    message.value
                );
            }).catch(err => console.error('Failed to persist pulse:', err));
        }
    }

    /**
     * Broadcast focus timer sync
     */
    broadcastFocus(message: Omit<FocusSyncMessage, 'type' | 'timestamp'>) {
        if (!this.sendFocusAction) return;

        const fullMessage: FocusSyncMessage = {
            ...message,
            type: 'focus-sync',
            timestamp: Date.now(),
        };

        this.sendFocusAction(fullMessage);
    }

    /**
     * Broadcast presence update
     */
    broadcastPresence(message: Omit<PresenceMessage, 'type' | 'timestamp'>) {
        if (!this.sendPresenceAction) return;

        const fullMessage: PresenceMessage = {
            ...message,
            type: 'presence',
            timestamp: Date.now(),
        };

        this.sendPresenceAction(fullMessage);
    }

    /**
     * Broadcast reaction
     */
    broadcastReaction(message: Omit<ReactionMessage, 'type' | 'timestamp'>) {
        if (!this.sendReactionAction) return;

        const fullMessage: ReactionMessage = {
            ...message,
            type: 'reaction',
            timestamp: Date.now(),
        };

        this.sendReactionAction(fullMessage);
    }

    /**
     * Get current peers
     */
    getPeers() {
        return this.room ? this.room.getPeers() : {};
    }

    /**
     * Handle incoming messages
     */
    private handleMessage(data: any, peerId: string) {
        // Ensure message has userId from peerId if missing
        const message = {
            ...data,
            userId: data.userId || peerId // Fallback to peerId if userId missing
        } as P2PMessage;

        this.events.onMessage(message);
    }
}
