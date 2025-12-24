/**
 * Study Session Hook
 * 
 * React hook for managing study sessions with automatic tracking.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDatabase } from '@make-gold/lib/database-provider';
import { studySessions, activityPulses, dailyStats } from '@make-gold/lib/study-session-data-access';
import type { StudySessionRow, SessionType, PulseIntensity } from '@make-gold/lib/schema';

// Milestone thresholds for progress broadcasts
const MILESTONES = [25, 50, 75, 100, 150, 200];

interface UseStudySessionOptions {
    userId: string;
    sessionType?: SessionType;
    roomId?: string;
    autoStart?: boolean;
    onProgressBroadcast?: (cardsReviewed: number) => void;
}

interface StudySessionState {
    session: StudySessionRow | null;
    isActive: boolean;
    cardsReviewed: number;
    cardsCorrect: number;
    elapsedMinutes: number;
}

export function useStudySession(options: UseStudySessionOptions) {
    const { userId, sessionType = 'solo', roomId, autoStart = false, onProgressBroadcast } = options;
    const { db } = useDatabase();

    const [state, setState] = useState<StudySessionState>({
        session: null,
        isActive: false,
        cardsReviewed: 0,
        cardsCorrect: 0,
        elapsedMinutes: 0,
    });

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load active session on mount
    useEffect(() => {
        if (!db) return;

        const loadActiveSession = async () => {
            const activeSession = await studySessions.getActive(db, userId);
            if (activeSession) {
                setState({
                    session: activeSession,
                    isActive: true,
                    cardsReviewed: activeSession.cards_reviewed,
                    cardsCorrect: activeSession.cards_correct,
                    elapsedMinutes: calculateElapsedMinutes(activeSession.started_at),
                });
            } else if (autoStart) {
                await startSession();
            }
        };

        loadActiveSession();
    }, [db, userId, autoStart]);

    // Update elapsed time every minute
    useEffect(() => {
        if (!state.isActive || !state.session) return;

        intervalRef.current = setInterval(() => {
            setState(prev => ({
                ...prev,
                elapsedMinutes: calculateElapsedMinutes(prev.session!.started_at),
            }));
        }, 60000); // Update every minute

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [state.isActive, state.session]);

    const startSession = useCallback(async () => {
        if (!db || state.isActive) return;

        try {
            const session = await studySessions.create(db, userId, sessionType, roomId);
            setState({
                session,
                isActive: true,
                cardsReviewed: 0,
                cardsCorrect: 0,
                elapsedMinutes: 0,
            });
        } catch (error) {
            console.error('Failed to start session:', error);
        }
    }, [db, userId, sessionType, roomId, state.isActive]);

    const endSession = useCallback(async (focusScore?: number) => {
        if (!db || !state.session) return;

        try {
            await studySessions.end(db, state.session.id, {
                cardsReviewed: state.cardsReviewed,
                cardsCorrect: state.cardsCorrect,
                focusScore,
            });

            // Update daily stats
            await dailyStats.update(db, userId, {
                cardsReviewed: state.cardsReviewed,
                studyTimeMinutes: state.elapsedMinutes,
                groupSessions: sessionType === 'group' ? 1 : 0,
            });

            setState({
                session: null,
                isActive: false,
                cardsReviewed: 0,
                cardsCorrect: 0,
                elapsedMinutes: 0,
            });
        } catch (error) {
            console.error('Failed to end session:', error);
        }
    }, [db, state, userId, sessionType]);

    const recordCardReview = useCallback(async (isCorrect: boolean, intensity: PulseIntensity, cardId?: string) => {
        if (!db || !state.session) return;

        const newCardsReviewed = state.cardsReviewed + 1;
        const newCardsCorrect = state.cardsCorrect + (isCorrect ? 1 : 0);

        try {
            // Update session stats
            await studySessions.updateStats(db, state.session.id, newCardsReviewed, newCardsCorrect);

            // Create activity pulse
            await activityPulses.create(db, state.session.id, 'card_review', intensity, cardId);

            setState(prev => ({
                ...prev,
                cardsReviewed: newCardsReviewed,
                cardsCorrect: newCardsCorrect,
            }));

            // Broadcast progress on milestones
            if (MILESTONES.includes(newCardsReviewed) && onProgressBroadcast) {
                onProgressBroadcast(newCardsReviewed);
            }

            return { cardsReviewed: newCardsReviewed, cardsCorrect: newCardsCorrect };
        } catch (error) {
            console.error('Failed to record card review:', error);
        }
    }, [db, state]);

    const recordMilestone = useCallback(async (value: number) => {
        if (!db || !state.session) return;

        try {
            await activityPulses.create(db, state.session.id, 'milestone', undefined, undefined, value);
        } catch (error) {
            console.error('Failed to record milestone:', error);
        }
    }, [db, state.session]);

    return {
        ...state,
        startSession,
        endSession,
        recordCardReview,
        recordMilestone,
    };
}

function calculateElapsedMinutes(startedAt: string): number {
    const start = new Date(startedAt);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / 60000);
}
