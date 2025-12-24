import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@make-gold/lib/database-provider';
import { syncMultipleTables } from '@make-gold/lib/sync-ios14';
import { getUserPermissionService } from '@/services/UserPermissionService';
import { useDatabaseStatus } from '@/components/database/SmartDatabaseProvider';
import { isIOS14OrLower } from '@/services/PlatformDetectionService';

export function SyncManager() {
    const { user } = useAuth();
    const { isLocalInitialized, isCloudOnly } = useDatabaseStatus();
    const { db } = useDatabase(); // 保持Hook调用顺序
    const [isPremium, setIsPremium] = useState<boolean>(false);
    const [checkingPremium, setCheckingPremium] = useState(true);

    // iOS14设备不需要同步功能（只使用云端数据库）
    const isiOS14 = isIOS14OrLower();
    
    // 早期返回，避免后续useEffect执行
    useEffect(() => {
        if (isiOS14) {
            console.log('[SyncManager] iOS14设备，跳过同步功能（使用云端数据库）');
            return;
        }
    }, [isiOS14]);

    if (isiOS14) {
        return null;
    }

    // Check if user is premium
    useEffect(() => {
        if (!user) {
            setIsPremium(false);
            setCheckingPremium(false);
            return;
        }

        const checkPremiumStatus = async () => {
            try {
                const userPermissionService = getUserPermissionService();
                const premium = await userPermissionService.isPremiumUser(user.id);
                setIsPremium(premium);
                console.log('👤 User premium status:', premium);
            } catch (error) {
                console.error('Failed to check premium status:', error);
                setIsPremium(false);
            } finally {
                setCheckingPremium(false);
            }
        };

        setCheckingPremium(true);
        checkPremiumStatus();
    }, [user]);

    useEffect(() => {
        // Only sync if:
        // 1. User is logged in
        // 2. DB is ready
        // 3. User is premium (免费用户只使用本地数据库)
        // 4. Premium check is complete
        if (!user || !db || !isPremium || checkingPremium) {
            if (!checkingPremium && user && !isPremium) {
                console.log('💰 Free user detected - skipping Supabase sync, using local database only');
            }
            return;
        }

        console.log('🔄 Premium user authenticated, initializing Supabase sync...');

        // Define tables to sync
        // Note: Ensure these tables exist in Supabase and RLS policies allow access
        const tablesToSync = [
            { tableName: 'decks', primaryKey: ['id'] },
            { tableName: 'cards', primaryKey: ['id'] },
            { tableName: 'review_logs', primaryKey: ['id'] },
            { tableName: 'vocabulary_cards', primaryKey: ['id'] }
        ];

        let cleanup: (() => void) | undefined;

        const startSync = async () => {
            try {
                cleanup = await syncMultipleTables(db, tablesToSync);
                console.log('✅ Supabase sync initialized for premium user, tables:', tablesToSync.map(t => t.tableName).join(', '));
            } catch (error) {
                console.error('❌ Failed to start sync:', error);
            }
        };

        startSync();

        return () => {
            if (cleanup) {
                console.log('🛑 Stopping Supabase sync...');
                cleanup();
            }
        };
    }, [user, db, isPremium, checkingPremium]);

    return null;
}
