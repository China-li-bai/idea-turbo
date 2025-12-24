/**
 * Supabase Synchronization Layer
 *
 * This module centralizes all logic for synchronizing the local PGlite
 * database with a remote Supabase instance. It provides functions for
 * both initial data fetching and real-time updates via subscriptions.
 *
 * Principles:
 * - Decoupling: Separates sync logic from the PGlite provider and data access.
 * - Resilience: Includes basic error handling and validation.
 * - Clarity: Exports plain functions for predictable data flow.
 */

import { PGlite } from "@electric-sql/pglite";
import { createClient } from "@supabase/supabase-js";

// Supabase client (singleton)
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Type definitions for Supabase payloads
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

// Syncs a single table with Supabase
export async function syncTableWithSupabase(
  db: PGlite,
  tableName: string,
  primaryKey: string[]
) {
  validateIdentifier(tableName);
  primaryKey.forEach(validateIdentifier);

  // 1. Fetch initial data
  const { data: initialData, error } = await supabase.from(tableName).select("*");
  if (error) throw error;

  // 2. Insert or update local data
  if (initialData) {
    await db.transaction(async (tx) => {
      for (const row of initialData) {
        await insertOrUpdate(tx, tableName, row, primaryKey);
      }
    });
  }

  // 3. Subscribe to real-time changes
  const channel = supabase
    .channel(`public:${tableName}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: tableName },
      async (payload) => {
        await handleSupabaseChange(db, tableName, payload, primaryKey);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// Handles incoming Supabase changes
async function handleSupabaseChange(
  db: PGlite,
  tableName: string,
  payload: SupabaseChangePayload,
  primaryKey: string[]
) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  switch (eventType) {
    case "INSERT":
    case "UPDATE":
      await insertOrUpdate(db, tableName, newRecord, primaryKey);
      break;
    case "DELETE":
      await deleteRecord(db, tableName, oldRecord, primaryKey);
      break;
  }
}

// Inserts or updates a record
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

  await db.query(
    `INSERT INTO ${tableName} (${columns.join(", ")})
     VALUES (${placeholders})
     ON CONFLICT (${conflictClause}) DO UPDATE SET ${updateClause}`,
    values
  );
}

// Deletes a record
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
