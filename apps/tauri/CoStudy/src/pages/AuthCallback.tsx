/**
 * Auth Callback Page
 * 
 * Handles OAuth callbacks and email confirmations from Supabase.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function AuthCallback() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check if user is authenticated
        if (user) {
            // Redirect to home after successful auth
            setTimeout(() => {
                navigate('/');
            }, 1000);
        }
    }, [user, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                {error ? (
                    <>
                        <div className="text-destructive text-lg font-semibold">认证失败</div>
                        <p className="text-muted-foreground">{error}</p>
                        <button
                            onClick={() => navigate('/auth')}
                            className="text-primary hover:underline"
                        >
                            返回登录
                        </button>
                    </>
                ) : (
                    <>
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="text-muted-foreground">正在验证...</p>
                    </>
                )}
            </div>
        </div>
    );
}
