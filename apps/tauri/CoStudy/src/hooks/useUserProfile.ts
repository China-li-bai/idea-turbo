/**
 * User Profile Hook
 * 
 * React hook for managing user profile and preferences.
 */

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@make-gold/lib/database-provider';
import { userProfiles } from '@make-gold/lib/study-session-data-access';
import { uuid } from '@make-gold/lib/uuid';
import type { UserProfileRow } from '@make-gold/lib/schema';

const LOCAL_USER_ID_KEY = 'make-gold-user-id';

export function useUserProfile() {
    const { db } = useDatabase();
    const [profile, setProfile] = useState<UserProfileRow | null>(null);
    const [loading, setLoading] = useState(true);

    // Get or create user ID
    const getUserId = useCallback((): string => {
        let userId = localStorage.getItem(LOCAL_USER_ID_KEY);
        if (!userId) {
            userId = uuid();
            localStorage.setItem(LOCAL_USER_ID_KEY, userId);
        }
        return userId;
    }, []);

    // Load or create profile
    useEffect(() => {
        if (!db) return;

        const loadProfile = async () => {
            try {
                const userId = getUserId();
                let userProfile = await userProfiles.get(db, userId);

                if (!userProfile) {
                    // Create default profile
                    const displayName = `学习者${Math.floor(Math.random() * 10000)}`;
                    userProfile = await userProfiles.create(db, displayName);
                    localStorage.setItem(LOCAL_USER_ID_KEY, userProfile.id);
                }

                setProfile(userProfile);
            } catch (error) {
                console.error('Failed to load user profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [db, getUserId]);

    const updateProfile = useCallback(async (
        updates: Partial<Omit<UserProfileRow, 'id' | 'created_at' | 'updated_at'>>
    ) => {
        if (!db || !profile) return;

        try {
            await userProfiles.update(db, profile.id, updates);

            // Reload profile
            const updated = await userProfiles.get(db, profile.id);
            if (updated) {
                setProfile(updated);
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
        }
    }, [db, profile]);

    const incrementStreak = useCallback(async () => {
        if (!db || !profile) return;

        try {
            await userProfiles.incrementStreak(db, profile.id);

            // Reload profile
            const updated = await userProfiles.get(db, profile.id);
            if (updated) {
                setProfile(updated);
            }
        } catch (error) {
            console.error('Failed to increment streak:', error);
        }
    }, [db, profile]);

    const resetStreak = useCallback(async () => {
        if (!db || !profile) return;

        try {
            await userProfiles.resetStreak(db, profile.id);

            // Reload profile
            const updated = await userProfiles.get(db, profile.id);
            if (updated) {
                setProfile(updated);
            }
        } catch (error) {
            console.error('Failed to reset streak:', error);
        }
    }, [db, profile]);

    return {
        profile,
        loading,
        userId: profile?.id || getUserId(),
        updateProfile,
        incrementStreak,
        resetStreak,
    };
}
