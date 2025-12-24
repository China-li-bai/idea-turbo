/**
 * Database Provider (PGlite)
 *
 * This module provides a React Context Provider for initializing and
 * accessing the PGlite database instance throughout the application.
 * It is designed to be the single entry point for database setup.
 *
 * Principles:
 * - Simplicity: Focuses solely on PGlite initialization and access.
 * - Decoupling: No direct data access or sync logic; delegates to other modules.
 * - Resilience: Handles initialization errors gracefully.
 * - React Compliance: Follows React's Rules of Hooks strictly.
 */

import { PGlite } from "@electric-sql/pglite";
import { createContext, useContext, useEffect, useState } from "react";
import {
    PGliteProvider as OfficialPGliteProvider,
    usePGlite as useOfficialPGlite
} from "@electric-sql/pglite-react";

// Database context interface
interface DatabaseContextType {
    db: PGlite | null;
    isLoading: boolean;
    error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
    db: null,
    isLoading: true,
    error: null,
});

interface DatabaseProviderProps {
    children: React.ReactNode;
    db?: PGlite;
    createDb?: () => Promise<PGlite>;
}

/**
 * Database Provider component
 * Wraps the official PGliteProvider and manages database initialization
 */
export function DatabaseProvider({ children, db, createDb }: DatabaseProviderProps) {
    const [context, setContext] = useState<DatabaseContextType>({
        db: null,
        isLoading: true,
        error: null,
    });

    useEffect(() => {
        async function initDatabase() {
            try {
                if (db) {
                    // Use externally provided db instance
                    setContext({ db, isLoading: false, error: null });
                    return;
                }
                if (createDb) {
                    // Use external factory function
                    const dbInstance = await createDb();
                    setContext({ db: dbInstance, isLoading: false, error: null });
                    return;
                }
                // Pure mode: no initialization
                setContext({ db: null, isLoading: false, error: null });
            } catch (error) {
                console.error("Failed to initialize PGlite:", error);
                setContext({
                    db: null,
                    isLoading: false,
                    error: error instanceof Error ? error : new Error(String(error))
                });
            }
        }
        initDatabase();
    }, [db, createDb]);

    if (context.db) {
        return (
            <OfficialPGliteProvider db={context.db as any}>
                <DatabaseContext.Provider value={context}>
                    {children}
                </DatabaseContext.Provider>
            </OfficialPGliteProvider>
        );
    }


    return (
        <DatabaseContext.Provider value={context}>
            {children}
        </DatabaseContext.Provider>
    );
}


export function useDatabase() {
    const ctx = useContext(DatabaseContext);

    let officialDb: any = null;
    try {
        officialDb = useOfficialPGlite();
    } catch (error) {
        officialDb = null;
    }

    const effectiveDb = officialDb ?? ctx.db;

    return {
        db: effectiveDb,
        isLoading: ctx.isLoading,
        error: ctx.error,
    };
}

/**
 * Alternative hook that doesn't use the official PGlite hook
 * Use this if you only need basic db access without LiveQuery features
 */
export function useDatabaseContext() {
    return useContext(DatabaseContext);
}

// Backward compatibility exports
export const ElectricProvider = DatabaseProvider;
export const useElectric = useDatabase;
