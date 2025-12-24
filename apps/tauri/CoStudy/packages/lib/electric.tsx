/**
 * @deprecated This file is deprecated. Please use database-provider.tsx instead.
 * 
 * BACKWARD COMPATIBILITY SHIM
 * 
 * This file has been refactored to fix React hooks violations and naming conflicts.
 * All functionality has been moved to database-provider.tsx with the following changes:
 * 
 * 1. Fixed React Rules of Hooks violations (line 77 - conditional hook call)
 * 2. Renamed hooks to avoid conflicts with @electric-sql/pglite-react
 * 3. Added better error handling
 * 
 * Migration:
 * - Replace: import { usePGlite } from '@make-gold/lib/electric'
 * - With:    import { useDatabase } from '@make-gold/lib/database-provider'
 * 
 * - Replace: import { ElectricProvider } from '@make-gold/lib/electric'
 * - With:    import { DatabaseProvider } from '@make-gold/lib/database-provider'
 * 
 * This shim maintains backward compatibility but will be removed in a future version.
 */

// Re-export everything from the new database-provider module
export {
  DatabaseProvider as PGliteProvider,
  DatabaseProvider as ElectricProvider,
  useDatabase as usePGlite,
  useDatabase as useElectric,
  useDatabaseContext,
} from "./database-provider";

// Log deprecation warning in development
if (typeof import.meta.env !== 'undefined' && import.meta.env.DEV) {
  console.warn(
    "[DEPRECATED] @make-gold/lib/electric is deprecated. " +
    "Please migrate to @make-gold/lib/database-provider. " +
    "See refactoring-guide.md for migration instructions."
  );
}
