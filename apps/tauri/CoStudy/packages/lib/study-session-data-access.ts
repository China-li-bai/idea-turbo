/**
 * Study Session Data Access Layer
 * 
 * Provides CRUD operations for study sessions, user profiles, and related data.
 */

import { PGlite } from '@electric-sql/pglite';
import { uuid } from './uuid';
import type {
    StudySessionRow,
    UserProfileRow,
    StudyRoomHistoryRow,
    ActivityPulseRow,
    AchievementRow,
    DailyStatsRow,
    SessionType,
    PulseType,
    PulseIntensity,
} from './schema';

// ============================================
// Study Sessions
// ============================================

export async function createStudySession(
    db: PGlite,
    userId: string,
    sessionType: SessionType = 'solo',
    roomId?: string
): Promise<StudySessionRow> {
    const id = uuid();
    const now = new Date().toISOString();

    await db.query(
        `INSERT INTO study_sessions (id, user_id, session_type, room_id, started_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, userId, sessionType, roomId || null, now, now]
    );

    const result = await db.query<StudySessionRow>(
        'SELECT * FROM study_sessions WHERE id = $1',
        [id]
    );

    return result.rows[0];
}

export async function endStudySession(
    db: PGlite,
    sessionId: string,
    stats: {
        cardsReviewed: number;
        cardsCorrect: number;
        focusScore?: number;
    }
): Promise<void> {
    const endedAt = new Date().toISOString();

    // Get session start time to calculate duration
    const session = await db.query<StudySessionRow>(
        'SELECT started_at FROM study_sessions WHERE id = $1',
        [sessionId]
    );

    if (session.rows.length === 0) {
        throw new Error(`Session ${sessionId} not found`);
    }

    const startTime = new Date(session.rows[0].started_at);
    const endTime = new Date(endedAt);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    await db.query(
        `UPDATE study_sessions 
     SET ended_at = $1, 
         duration_minutes = $2,
         cards_reviewed = $3,
         cards_correct = $4,
         focus_score = $5
     WHERE id = $6`,
        [endedAt, durationMinutes, stats.cardsReviewed, stats.cardsCorrect, stats.focusScore || null, sessionId]
    );
}

export async function getActiveSession(db: PGlite, userId: string): Promise<StudySessionRow | null> {
    const result = await db.query<StudySessionRow>(
        'SELECT * FROM study_sessions WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
        [userId]
    );

    return result.rows[0] || null;
}

export async function getRecentSessions(
    db: PGlite,
    userId: string,
    limit: number = 10
): Promise<StudySessionRow[]> {
    const result = await db.query<StudySessionRow>(
        'SELECT * FROM study_sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT $2',
        [userId, limit]
    );

    return result.rows;
}

export async function updateSessionStats(
    db: PGlite,
    sessionId: string,
    cardsReviewed: number,
    cardsCorrect: number
): Promise<void> {
    await db.query(
        `UPDATE study_sessions 
     SET cards_reviewed = $1, cards_correct = $2
     WHERE id = $3`,
        [cardsReviewed, cardsCorrect, sessionId]
    );
}

// ============================================
// User Profiles
// ============================================

export async function createUserProfile(
    db: PGlite,
    displayName: string,
    avatarColor?: string
): Promise<UserProfileRow> {
    const id = uuid();
    const now = new Date().toISOString();
    const color = avatarColor || generateRandomColor();

    await db.query(
        `INSERT INTO user_profiles (id, display_name, avatar_color, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
        [id, displayName, color, now, now]
    );

    const result = await db.query<UserProfileRow>(
        'SELECT * FROM user_profiles WHERE id = $1',
        [id]
    );

    return result.rows[0];
}

export async function getUserProfile(db: PGlite, userId: string): Promise<UserProfileRow | null> {
    const result = await db.query<UserProfileRow>(
        'SELECT * FROM user_profiles WHERE id = $1',
        [userId]
    );

    return result.rows[0] || null;
}

export async function updateUserProfile(
    db: PGlite,
    userId: string,
    updates: Partial<Omit<UserProfileRow, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
    });

    if (fields.length === 0) return;

    fields.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());
    values.push(userId);

    await db.query(
        `UPDATE user_profiles SET ${fields.join(', ')} WHERE id = $${paramIndex + 1}`,
        values
    );
}

export async function incrementStreak(db: PGlite, userId: string): Promise<void> {
    await db.query(
        `UPDATE user_profiles 
     SET current_streak = current_streak + 1,
         longest_streak = GREATEST(longest_streak, current_streak + 1),
         updated_at = $1
     WHERE id = $2`,
        [new Date().toISOString(), userId]
    );
}

export async function resetStreak(db: PGlite, userId: string): Promise<void> {
    await db.query(
        `UPDATE user_profiles 
     SET current_streak = 0,
         updated_at = $1
     WHERE id = $2`,
        [new Date().toISOString(), userId]
    );
}

// ============================================
// Activity Pulses
// ============================================

export async function createActivityPulse(
    db: PGlite,
    sessionId: string,
    pulseType: PulseType,
    intensity?: PulseIntensity,
    cardId?: string,
    value?: number
): Promise<ActivityPulseRow> {
    const id = uuid();
    const now = new Date().toISOString();

    await db.query(
        `INSERT INTO activity_pulses (id, session_id, pulse_type, intensity, card_id, value, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, sessionId, pulseType, intensity || null, cardId || null, value || null, now]
    );

    const result = await db.query<ActivityPulseRow>(
        'SELECT * FROM activity_pulses WHERE id = $1',
        [id]
    );

    return result.rows[0];
}

export async function getSessionPulses(
    db: PGlite,
    sessionId: string
): Promise<ActivityPulseRow[]> {
    const result = await db.query<ActivityPulseRow>(
        'SELECT * FROM activity_pulses WHERE session_id = $1 ORDER BY created_at ASC',
        [sessionId]
    );

    return result.rows;
}

// ============================================
// Daily Stats
// ============================================

export async function updateDailyStats(
    db: PGlite,
    userId: string,
    updates: {
        cardsReviewed?: number;
        studyTimeMinutes?: number;
        groupSessions?: number;
        pulsesSent?: number;
        reactionsReceived?: number;
    }
): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Try to get existing stats for today
    const existing = await db.query<DailyStatsRow>(
        'SELECT * FROM daily_stats WHERE user_id = $1 AND stat_date = $2',
        [userId, today]
    );

    if (existing.rows.length === 0) {
        // Create new stats entry
        const id = uuid();
        await db.query(
            `INSERT INTO daily_stats (
        id, user_id, stat_date, 
        cards_reviewed, study_time_minutes, sessions_count,
        group_sessions, pulses_sent, reactions_received,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                id,
                userId,
                today,
                updates.cardsReviewed || 0,
                updates.studyTimeMinutes || 0,
                1, // sessions_count
                updates.groupSessions || 0,
                updates.pulsesSent || 0,
                updates.reactionsReceived || 0,
                new Date().toISOString(),
            ]
        );
    } else {
        // Update existing stats
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.cardsReviewed !== undefined) {
            fields.push(`cards_reviewed = cards_reviewed + $${paramIndex}`);
            values.push(updates.cardsReviewed);
            paramIndex++;
        }

        if (updates.studyTimeMinutes !== undefined) {
            fields.push(`study_time_minutes = study_time_minutes + $${paramIndex}`);
            values.push(updates.studyTimeMinutes);
            paramIndex++;
        }

        if (updates.groupSessions !== undefined) {
            fields.push(`group_sessions = group_sessions + $${paramIndex}`);
            values.push(updates.groupSessions);
            paramIndex++;
        }

        if (updates.pulsesSent !== undefined) {
            fields.push(`pulses_sent = pulses_sent + $${paramIndex}`);
            values.push(updates.pulsesSent);
            paramIndex++;
        }

        if (updates.reactionsReceived !== undefined) {
            fields.push(`reactions_received = reactions_received + $${paramIndex}`);
            values.push(updates.reactionsReceived);
            paramIndex++;
        }

        if (fields.length > 0) {
            values.push(userId, today);
            await db.query(
                `UPDATE daily_stats SET ${fields.join(', ')} 
         WHERE user_id = $${paramIndex} AND stat_date = $${paramIndex + 1}`,
                values
            );
        }
    }
}

export async function getDailyStats(
    db: PGlite,
    userId: string,
    days: number = 7
): Promise<DailyStatsRow[]> {
    const result = await db.query<DailyStatsRow>(
        `SELECT * FROM daily_stats 
     WHERE user_id = $1 
     ORDER BY stat_date DESC 
     LIMIT $2`,
        [userId, days]
    );

    return result.rows;
}

// ============================================
// Utility Functions
// ============================================

function generateRandomColor(): string {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Export all functions
export const studySessions = {
    create: createStudySession,
    end: endStudySession,
    getActive: getActiveSession,
    getRecent: getRecentSessions,
    updateStats: updateSessionStats,
};

export const userProfiles = {
    create: createUserProfile,
    get: getUserProfile,
    update: updateUserProfile,
    incrementStreak,
    resetStreak,
};

export const activityPulses = {
    create: createActivityPulse,
    getSessionPulses,
};

export const dailyStats = {
    update: updateDailyStats,
    get: getDailyStats,
};
