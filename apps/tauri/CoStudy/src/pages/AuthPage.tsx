/**
 * Authentication Page
 * 
 * Provides login, signup, and password reset functionality.
 * Built with shadcn/ui components following Supabase best practices.
 * Refactored to use AuthService for data access.
 */

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthService, AuthResult, MagicLinkResult, PasswordResetResult } from '@/services/AuthService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

type AuthMode = 'signin' | 'signup' | 'magic-link' | 'reset-password';

export function AuthPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { loading } = useAuth();
    
    // 获取认证服务实例
    const authService = getAuthService();

    const [mode, setMode] = useState<AuthMode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check if we're in callback mode
    const isCallback = searchParams.get('type') === 'recovery';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsSubmitting(true);

        try {
            if (mode === 'signin') {
                const result: AuthResult = await authService.signIn(email, password);
                if (!result.success) {
                    setError(result.error || '登录失败');
                } else {
                    navigate('/');
                }
            } else if (mode === 'signup') {
                if (password !== confirmPassword) {
                    setError('密码不匹配');
                    setIsSubmitting(false);
                    return;
                }
                if (password.length < 6) {
                    setError('密码至少需要6个字符');
                    setIsSubmitting(false);
                    return;
                }
                const result: AuthResult = await authService.signUp(email, password);
                if (!result.success) {
                    setError(result.error || '注册失败');
                } else {
                    setSuccess('注册成功！请检查您的邮箱以确认账户。');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                }
            } else if (mode === 'magic-link') {
                const result: MagicLinkResult = await authService.signInWithOtp(email);
                if (!result.success) {
                    setError(result.error || '发送魔法链接失败');
                } else {
                    setSuccess('魔法链接已发送到您的邮箱！请查收。');
                    setEmail('');
                }
            } else if (mode === 'reset-password') {
                const result: PasswordResetResult = await authService.resetPassword(email);
                if (!result.success) {
                    setError(result.error || '发送重置链接失败');
                } else {
                    setSuccess('密码重置链接已发送到您的邮箱！');
                    setEmail('');
                }
            }
        } catch (err) {
            setError('发生未知错误，请重试');
            console.error('Auth error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTitle = () => {
        switch (mode) {
            case 'signin': return '登录';
            case 'signup': return '注册';
            case 'magic-link': return '魔法链接登录';
            case 'reset-password': return '重置密码';
        }
    };

    const getDescription = () => {
        switch (mode) {
            case 'signin': return '使用您的账户登录';
            case 'signup': return '创建新账户';
            case 'magic-link': return '我们将发送登录链接到您的邮箱';
            case 'reset-password': return '输入您的邮箱以重置密码';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                {/* Back button */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    返回首页
                </Link>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{getTitle()}</CardTitle>
                        <CardDescription>{getDescription()}</CardDescription>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {success && (
                                <Alert className="border-green-500 text-green-700 dark:text-green-400">
                                    <AlertDescription>{success}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">邮箱</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isSubmitting}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {(mode === 'signin' || mode === 'signup') && (
                                <div className="space-y-2">
                                    <Label htmlFor="password">密码</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            disabled={isSubmitting}
                                            className="pl-10"
                                            minLength={6}
                                        />
                                    </div>
                                </div>
                            )}

                            {mode === 'signup' && (
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">确认密码</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            disabled={isSubmitting}
                                            className="pl-10"
                                            minLength={6}
                                        />
                                    </div>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isSubmitting || loading}
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {mode === 'signin' && '登录'}
                                {mode === 'signup' && '注册'}
                                {mode === 'magic-link' && '发送魔法链接'}
                                {mode === 'reset-password' && '发送重置链接'}
                            </Button>
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-2">
                            {mode === 'signin' && (
                                <>
                                    <div className="flex items-center justify-between w-full text-sm">
                                        <button
                                            type="button"
                                            onClick={() => setMode('magic-link')}
                                            className="text-primary hover:underline"
                                        >
                                            使用魔法链接登录
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMode('reset-password')}
                                            className="text-muted-foreground hover:text-foreground hover:underline"
                                        >
                                            忘记密码？
                                        </button>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        还没有账户？{' '}
                                        <button
                                            type="button"
                                            onClick={() => setMode('signup')}
                                            className="text-primary hover:underline"
                                        >
                                            注册
                                        </button>
                                    </div>
                                </>
                            )}

                            {mode === 'signup' && (
                                <div className="text-sm text-muted-foreground">
                                    已有账户？{' '}
                                    <button
                                        type="button"
                                        onClick={() => setMode('signin')}
                                        className="text-primary hover:underline"
                                    >
                                        登录
                                    </button>
                                </div>
                            )}

                            {(mode === 'magic-link' || mode === 'reset-password') && (
                                <div className="text-sm text-muted-foreground">
                                    <button
                                        type="button"
                                        onClick={() => setMode('signin')}
                                        className="text-primary hover:underline"
                                    >
                                        返回登录
                                    </button>
                                </div>
                            )}
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    登录即表示您同意我们的服务条款和隐私政策
                </p>
            </div>
        </div>
    );
}
