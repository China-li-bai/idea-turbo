/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the application.
 * Follows Supabase's official recommended patterns for React apps.
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { getSupabaseClient } from '@make-gold/lib/supabase-ios14';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkAndUpdateDataSource } from '@/services/UnifiedDataAccess';
import { getUserAuthorizationService } from '@/services/UserAuthorizationService';

// Define types locally to avoid import issues
type User = any;
type Session = any;
type AuthError = { message: string; status?: number } | null;

interface AuthContextType {
    // State
    user: User | null;
    session: Session | null;
    loading: boolean;
    error: AuthError | null;

    // Methods
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signInWithOtp: (email: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<{ error: AuthError | null }>;
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>;

    // Client access (for advanced use cases)
    client: SupabaseClient | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [client] = useState<SupabaseClient>(() => getSupabaseClient());
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<AuthError | null>(null);

    // Initialize auth state
    useEffect(() => {
        // Get initial session
        client.auth.getSession().then(({ data: { session }, error }: { data: { session: Session | null }, error: AuthError | null }) => {
            if (error) {
                console.error('Error getting session:', error);
                setError(error);
            }
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            
            // Check and update data source for iOS 14 premium users
            if (session?.user) {
                const authService = getUserAuthorizationService();
                authService.setCurrentUser(session.user.id);
                checkAndUpdateDataSource().catch(console.error);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = client.auth.onAuthStateChange(
            async (event: string, session: Session | null) => {
                console.log('Auth state changed:', event);
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
                setError(null);
                
                // Update data source for iOS 14 premium users
                if (session?.user) {
                    const authService = getUserAuthorizationService();
                    authService.setCurrentUser(session.user.id);
                    await checkAndUpdateDataSource();
                } else {
                    const authService = getUserAuthorizationService();
                    authService.setCurrentUser(null);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [client]);

    // Sign in with email and password
    const signIn = useCallback(async (email: string, password: string) => {
        setLoading(true);
        setError(null);

        const { data, error } = await client.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error);
            setLoading(false);
            return { error };
        }

        setSession(data.session);
        setUser(data.user);
        setLoading(false);
        return { error: null };
    }, [client]);

    // Sign up with email and password
    const signUp = useCallback(async (email: string, password: string) => {
        setLoading(true);
        setError(null);

        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error);
            setLoading(false);
            return { error };
        }

        // Note: User won't be logged in until they confirm their email
        setLoading(false);
        return { error: null };
    }, [client]);

    // Sign in with magic link (OTP)
    const signInWithOtp = useCallback(async (email: string) => {
        setLoading(true);
        setError(null);

        const { error } = await client.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error);
            setLoading(false);
            return { error };
        }

        setLoading(false);
        return { error: null };
    }, [client]);

    // Sign out
    const signOut = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { error } = await client.auth.signOut();

        if (error) {
            setError(error);
            setLoading(false);
            return { error };
        }

        setSession(null);
        setUser(null);
        setLoading(false);
        return { error: null };
    }, [client]);

    // Reset password
    const resetPassword = useCallback(async (email: string) => {
        setLoading(true);
        setError(null);

        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });

        if (error) {
            setError(error);
            setLoading(false);
            return { error };
        }

        setLoading(false);
        return { error: null };
    }, [client]);

    const value: AuthContextType = {
        user,
        session,
        loading,
        error,
        signIn,
        signUp,
        signInWithOtp,
        signOut,
        resetPassword,
        client,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
