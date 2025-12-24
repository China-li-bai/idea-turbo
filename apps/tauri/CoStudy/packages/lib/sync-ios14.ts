/**
 * Supabase Synchronization Layer (iOS 14 Compatible)
 *
 * This module centralizes all logic for synchronizing the local PGlite
 * database with a remote Supabase instance. It provides functions for
 * both initial data fetching and real-time updates via subscriptions.
 *
 * Principles:
 * - Decoupling: Separates sync logic from the database provider and data access.
 * - Resilience: Includes comprehensive error handling and validation.
 * - Clarity: Exports plain functions for predictable data flow.
 * - iOS 14 Compatibility: Uses the iOS 14 compatible Supabase wrapper.
 */

import { PGlite } from "@electric-sql/pglite";
import { getSupabaseClient } from "./supabase-ios14";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Get the Supabase client using the iOS 14 compatible wrapper
export const supabase = getSupabaseClient();

// Type definitions for Supabase payloads (backward compatibility)
interface SupabaseChangePayload {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new?: any;
    old?: any;
    [key: string]: any;
}

// Validates table and column names to prevent SQL injection
function validateIdentifier(name: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(`Invalid identifier: ${name}`);
    }
}

/**
 * Syncs a single table with Supabase
 * iOS 14 compatible version with enhanced error handling
 */
export async function syncTableWithSupabase(
    db: PGlite,
    tableName: string,
    primaryKey: string[]
) {
    validateIdentifier(tableName);
    primaryKey.forEach(validateIdentifier);

    try {
        // 1. Fetch initial data
        const { data: initialData, error } = await supabase.from(tableName).select("*");
        if (error) throw error;

        // 2. Insert or update local data
        if (initialData && initialData.length > 0) {
            await db.transaction(async (tx) => {
                for (const row of initialData) {
                    await insertOrUpdate(tx, tableName, row, primaryKey);
                }
            });
            console.log(`Synced ${initialData.length} rows from ${tableName}`);
        }

        // 3. Subscribe to real-time changes
        const channel = supabase
            .channel(`public:${tableName}`)
            .on(
                "postgres_changes" as any,
                { event: "*", schema: "public", table: tableName },
                async (payload: RealtimePostgresChangesPayload<any>) => {
                    try {
                        await handleSupabaseChange(db, tableName, payload, primaryKey);
                    } catch (error) {
                        console.error(`Error handling change for ${tableName}:`, error);
                    }
                }
            )
            .subscribe((status) => {
                console.log(`Subscription status for ${tableName}:`, status);
            });

        return () => supabase.removeChannel(channel);
    } catch (error) {
        console.error(`Error syncing table ${tableName}:`, error);
        throw error;
    }
}

/**
 * Handles incoming Supabase changes
 * Compatible with both old and new payload formats
 */
async function handleSupabaseChange(
    db: PGlite,
    tableName: string,
    payload: RealtimePostgresChangesPayload<any> | SupabaseChangePayload,
    primaryKey: string[]
) {
    const eventType = payload.eventType;
    const newRecord = payload.new;
    const oldRecord = payload.old;

    switch (eventType) {
        case "INSERT":
        case "UPDATE":
            if (newRecord) {
                await insertOrUpdate(db, tableName, newRecord, primaryKey);
            }
            break;
        case "DELETE":
            if (oldRecord) {
                await deleteRecord(db, tableName, oldRecord, primaryKey);
            }
            break;
    }
}

/**
 * Inserts or updates a record in the local database
 * Uses UPSERT pattern with ON CONFLICT
 */
async function insertOrUpdate(
    db: PGlite | any, // Can be PGlite or a transaction
    tableName: string,
    record: Record<string, any>,
    primaryKey: string[]
) {
    const columns = Object.keys(record);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const values = Object.values(record);
    const conflictClause = primaryKey.join(", ");

    const updateClause = columns
        .filter((col) => !primaryKey.includes(col))
        .map((col) => `${col} = EXCLUDED.${col}`)
        .join(", ");

    // Handle edge case where all columns are primary keys
    const updatePart = updateClause ? `DO UPDATE SET ${updateClause}` : "DO NOTHING";

    const query = `
    INSERT INTO ${tableName} (${columns.join(", ")})
    VALUES (${placeholders})
    ON CONFLICT (${conflictClause}) ${updatePart}
  `;

    await db.query(query, values);
}

/**
 * Deletes a record from the local database
 */
async function deleteRecord(
    db: PGlite,
    tableName: string,
    record: Record<string, any>,
    primaryKey: string[]
) {
    const conditions = primaryKey.map((key, i) => `${key} = $${i + 1}`).join(" AND ");
    const values = primaryKey.map((key) => record[key]);

    await db.query(`DELETE FROM ${tableName} WHERE ${conditions}`, values);
}

/**
 * Batch sync multiple tables
 * Returns cleanup functions for all subscriptions
 */
export async function syncMultipleTables(
    db: PGlite,
    tables: Array<{ tableName: string; primaryKey: string[] }>
) {
    const cleanupFunctions = await Promise.all(
        tables.map(({ tableName, primaryKey }) =>
            syncTableWithSupabase(db, tableName, primaryKey)
        )
    );

    return () => {
        cleanupFunctions.forEach((cleanup) => cleanup());
    };
}

/**
 * Upload local changes to Supabase
 * Useful for offline-first scenarios
 */
export async function uploadToSupabase(
    tableName: string,
    records: Record<string, any>[]
) {
    validateIdentifier(tableName);

    const { data, error } = await supabase
        .from(tableName)
        .upsert(records, { onConflict: "id" }); // Adjust conflict column as needed

    if (error) throw error;
    return data;
}

/**
 * Check Supabase connection health
 * Note: 404 errors are considered successful connections (table doesn't exist but server responded)
 */
export async function checkSupabaseConnection(): Promise<boolean> {
    try {
        // Method 1: Try a simple query - 404 means connection works but table doesn't exist
        const { error } = await supabase.from("_health").select("*").limit(0);

        // 404 (table not found) is actually a SUCCESS - it means we connected to Supabase
        if (!error) {
            console.log('✅ Connection successful - table exists');
            return true;
        }

        // Check if it's a "table not found" error (code 42P01 or message contains "does not exist")
        if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('not found')) {
            console.log('✅ Connection successful - server responded (table does not exist, which is normal)');
            return true;
        }

        // Method 2: Try to get schema info (this endpoint always exists)
        try {
            const url = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : '';
            const key = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : '';

            if (url && key) {
                const response = await fetch(`${url}/rest/v1/`, {
                    headers: {
                        'apikey': key,
                        'Authorization': `Bearer ${key}`
                    }
                });

                if (response.ok || response.status === 404) {
                    console.log('✅ Connection successful via REST endpoint');
                    return true;
                }
            }
        } catch (fetchError) {
            console.log('Fallback fetch also failed:', fetchError);
        }

        console.error("Connection check returned unexpected error:", error);
        return false;
    } catch (error) {
        console.error("Supabase connection check failed:", error);
        return false;
    }
}

