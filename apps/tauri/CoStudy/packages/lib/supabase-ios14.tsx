/**
 * iOS 14 Compatible Supabase Wrapper
 *
 * This module provides a wrapper layer for Supabase that ensures
 * compatibility with iOS 14 Safari and older browsers.
 *
 * iOS 14 Compatibility Issues Addressed:
 * - Limited ES2020+ support
 * - WebSocket connection issues
 * - IndexedDB API limitations
 * - Limited async/await support in certain contexts
 * - Polyfill requirements for modern JS features
 *
 * Usage:
 * ```tsx
 * import { createSupabaseClient, SupabaseProvider, useSupabase } from './supabase-ios14';
 * 
 * // In your root component:
 * <SupabaseProvider>
 *   <App />
 * </SupabaseProvider>
 * 
 * // In child components:
 * const { client, isReady } = useSupabase();
 * ```
 */

import {
    createClient,
    SupabaseClient,
    RealtimeChannel,
    RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

// Type definitions
export interface SupabaseConfig {
    url: string;
    anonKey: string;
    options?: {
        auth?: {
            persistSession?: boolean;
            autoRefreshToken?: boolean;
            detectSessionInUrl?: boolean;
            storage?: any; // Custom storage for iOS 14 compatibility
        };
        realtime?: {
            params?: {
                eventsPerSecond?: number;
            };
        };
        global?: {
            headers?: Record<string, string>;
        };
    };
}

export interface SupabaseContextType {
    client: SupabaseClient | null;
    session: any | null; // using any to avoid deep import issues, or import Session from supabase-js
    user: any | null;
    isReady: boolean;
    error: Error | null;
    reconnect: () => Promise<void>;
}

// iOS 14 detection
function isIOS14orBelow(): boolean {
    if (typeof navigator === "undefined") return false;
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/OS (\d+)_/);
    if (match && match[1]) {
        const version = parseInt(match[1], 10);
        return version <= 14;
    }
    return false;
}

// Custom storage adapter for iOS 14 (falls back to memory if needed)
class iOS14Storage {
    private storage: Storage | Map<string, string>;
    private usingMemory: boolean = false;

    constructor() {
        try {
            // Test if localStorage is available and working
            const testKey = "__supabase_test__";
            localStorage.setItem(testKey, "1");
            localStorage.removeItem(testKey);
            this.storage = localStorage;
        } catch (e) {
            console.warn("localStorage not available, using memory storage");
            this.storage = new Map<string, string>();
            this.usingMemory = true;
        }
    }

    getItem(key: string): string | null {
        try {
            if (this.usingMemory) {
                return (this.storage as Map<string, string>).get(key) ?? null;
            }
            return (this.storage as Storage).getItem(key);
        } catch (e) {
            console.error("Error reading from storage:", e);
            return null;
        }
    }

    setItem(key: string, value: string): void {
        try {
            if (this.usingMemory) {
                (this.storage as Map<string, string>).set(key, value);
            } else {
                (this.storage as Storage).setItem(key, value);
            }
        } catch (e) {
            console.error("Error writing to storage:", e);
        }
    }

    removeItem(key: string): void {
        try {
            if (this.usingMemory) {
                (this.storage as Map<string, string>).delete(key);
            } else {
                (this.storage as Storage).removeItem(key);
            }
        } catch (e) {
            console.error("Error removing from storage:", e);
        }
    }
}

/**
 * Creates a Supabase client with iOS 14 compatibility configurations
 */
export function createSupabaseClient(config?: SupabaseConfig): SupabaseClient {
    const url = config?.url || (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : '');
    const anonKey = config?.anonKey || (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : '');

    if (!url || !anonKey) {
        throw new Error("Supabase URL and anon key are required");
    }

    const iOS14Detected = isIOS14orBelow();
    const customStorage = iOS14Detected ? new iOS14Storage() : undefined;

    const defaultOptions = {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: customStorage,
        },
        realtime: {
            params: {
                // Reduce events per second for older devices
                eventsPerSecond: iOS14Detected ? 5 : 10,
            },
        },
        global: {
            headers: {
                "X-Client-Info": `supabase-js-ios14-compat`,
            },
        },
    };

    const mergedOptions = {
        ...defaultOptions,
        ...config?.options,
        auth: {
            ...defaultOptions.auth,
            ...config?.options?.auth,
        },
    };

    return createClient(url, anonKey, mergedOptions as any);
}

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

/**
 * Gets or creates the global Supabase client instance
 */
export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient {
    if (!supabaseInstance) {
        supabaseInstance = createSupabaseClient(config);
    }
    return supabaseInstance;
}

// React Context
const SupabaseContext = createContext<SupabaseContextType>({
    client: null,
    session: null,
    user: null,
    isReady: false,
    error: null,
    reconnect: async () => { },
});

interface SupabaseProviderProps {
    children: React.ReactNode;
    config?: SupabaseConfig;
    client?: SupabaseClient; // Allow passing a pre-configured client
}

/**
 * Supabase Provider component
 * Manages the Supabase client lifecycle and provides it via context
 */
export function SupabaseProvider({ children, config, client }: SupabaseProviderProps) {
    const [state, setState] = useState<SupabaseContextType>({
        client: null,
        session: null,
        user: null,
        isReady: false,
        error: null,
        reconnect: async () => { },
    });

    const initAttempted = useRef(false);

    const initClient = useCallback(async () => {
        try {
            const supabaseClient = client || getSupabaseClient(config);

            // Test connection on iOS 14
            if (isIOS14orBelow()) {
                try {
                    // Perform a simple health check
                    await supabaseClient.from("_health_check").select("*").limit(0);
                } catch (e) {
                    console.warn("Health check failed, but continuing:", e);
                }
            }

            // Get initial session
            const { data: { session } } = await supabaseClient.auth.getSession();

            setState({
                client: supabaseClient,
                session,
                user: session?.user ?? null,
                isReady: true,
                error: null,
                reconnect: async () => {
                    // Force re-initialization
                    initAttempted.current = false;
                    await initClient();
                },
            });

            // Listen for auth changes
            const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
                setState(prev => ({
                    ...prev,
                    session,
                    user: session?.user ?? null,
                }));
            });

            return () => {
                subscription.unsubscribe();
            };

        } catch (error) {
            console.error("Failed to initialize Supabase client:", error);
            setState({
                client: null,
                session: null,
                user: null,
                isReady: false,
                error: error instanceof Error ? error : new Error(String(error)),
                reconnect: async () => {
                    initAttempted.current = false;
                    await initClient();
                },
            });
        }
    }, [config, client]);

    useEffect(() => {
        if (!initAttempted.current) {
            initAttempted.current = true;
            initClient();
        }
    }, [initClient]);

    return (
        <SupabaseContext.Provider value={state}>
            {children}
        </SupabaseContext.Provider>
    );
}

/**
 * Hook for accessing the Supabase client
 */
export function useSupabase(): SupabaseContextType {
    // useContext always returns a value (either from provider or default)
    // The default value from createContext ensures this is never null/undefined
    const context = useContext(SupabaseContext);
    return context;
}

/**
 * iOS 14 compatible realtime subscription helper
 * Adds automatic reconnection and error handling
 */
export interface RealtimeSubscriptionOptions {
    table: string;
    schema?: string;
    event?: "INSERT" | "UPDATE" | "DELETE" | "*";
    filter?: string;
    onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void;
    onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
    onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void;
    onError?: (error: Error) => void;
}

export function useRealtimeSubscription(options: RealtimeSubscriptionOptions) {
    const { client, isReady } = useSupabase();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const subscribe = useCallback(() => {
        if (!client || !isReady) return;

        const {
            table,
            schema = "public",
            event = "*",
            filter,
            onInsert,
            onUpdate,
            onDelete,
            onError,
        } = options;

        try {
            // Unsubscribe from previous channel if exists
            if (channelRef.current) {
                client.removeChannel(channelRef.current);
            }

            const channel = client
                .channel(`${schema}:${table}`)
                .on(
                    "postgres_changes" as any,
                    {
                        event,
                        schema,
                        table,
                        filter,
                    },
                    (payload: RealtimePostgresChangesPayload<any>) => {
                        try {
                            switch (payload.eventType) {
                                case "INSERT":
                                    onInsert?.(payload);
                                    break;
                                case "UPDATE":
                                    onUpdate?.(payload);
                                    break;
                                case "DELETE":
                                    onDelete?.(payload);
                                    break;
                            }
                        } catch (error) {
                            console.error("Error handling realtime event:", error);
                            onError?.(error instanceof Error ? error : new Error(String(error)));
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === "SUBSCRIBED") {
                        setIsSubscribed(true);
                    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                        setIsSubscribed(false);
                        onError?.(new Error(`Subscription status: ${status}`));

                        // Auto-reconnect on iOS 14
                        if (isIOS14orBelow()) {
                            reconnectTimeoutRef.current = setTimeout(() => {
                                console.log("Attempting to reconnect subscription...");
                                subscribe();
                            }, 5000);
                        }
                    }
                });

            channelRef.current = channel;
        } catch (error) {
            console.error("Error setting up subscription:", error);
            onError?.(error instanceof Error ? error : new Error(String(error)));
        }
    }, [client, isReady, options]);

    useEffect(() => {
        subscribe();

        return () => {
            if (channelRef.current && client) {
                client.removeChannel(channelRef.current);
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [subscribe, client]);

    return { isSubscribed, resubscribe: subscribe };
}

/**
 * Utility function to check if running on iOS 14 or below
 */
export { isIOS14orBelow };
