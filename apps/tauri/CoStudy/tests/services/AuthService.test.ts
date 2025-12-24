/**
 * AuthService 测试套件
 * 
 * 测试 Supabase 认证功能：注册、登录、登出、密码重置
 * 使用 Mock 方式避免真实 API 调用
 */

import { describe, it, expect, beforeEach, vi, Mock, beforeAll } from 'vitest';
import { AuthService, AuthResult, MagicLinkResult, PasswordResetResult, UserProfile } from '../../src/services/AuthService';
import { UnifiedDataAccess } from '../../src/services/UnifiedDataAccess';
import { getSupabaseClient } from '@make-gold/lib/supabase-ios14';

// Mock Supabase client
vi.mock('@make-gold/lib/supabase-ios14', () => ({
    getSupabaseClient: vi.fn(),
}));

// Mock UnifiedDataAccess
vi.mock('../../src/services/UnifiedDataAccess', () => ({
    getUnifiedDataAccess: vi.fn(),
    UnifiedDataAccess: vi.fn(),
}));

describe('AuthService', () => {
    let authService: AuthService;
    let mockSupabaseClient: any;
    let mockDataAccess: any;

    // Mock window object for Node.js environment
    beforeAll(() => {
        global.window = {
            location: {
                origin: 'http://localhost:3000'
            }
        } as any;
    });

    beforeEach(() => {
        // 重置所有 mocks
        vi.clearAllMocks();

        // 创建 mock Supabase 客户端
        mockSupabaseClient = {
            auth: {
                signUp: vi.fn(),
                signInWithPassword: vi.fn(),
                signOut: vi.fn(),
                getUser: vi.fn(),
                signInWithOtp: vi.fn(),
                resetPasswordForEmail: vi.fn(),
                updateUser: vi.fn(),
                onAuthStateChange: vi.fn(() => ({
                    data: { subscription: { unsubscribe: vi.fn() } }
                })),
                getSession: vi.fn(),
            },
        };

        // 创建 mock UnifiedDataAccess
        mockDataAccess = {
            select: vi.fn(),
            insert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };

        (getSupabaseClient as Mock).mockReturnValue(mockSupabaseClient);

        // 创建 AuthService 实例
        authService = new AuthService(mockDataAccess);
    });

    describe('signUp - 用户注册', () => {
        it('应该成功注册新用户（邮件确认模式）', async () => {
            const email = 'newuser@example.com';
            const password = 'password123';
            const mockUser = {
                id: 'user-123',
                email,
                identities: [], // 邮件确认模式下为空
            };

            mockSupabaseClient.auth.signUp.mockResolvedValue({
                data: { user: mockUser },
                error: null,
            });

            const result: AuthResult = await authService.signUp(email, password);

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
                email,
                password,
            });
            // 不应该立即创建 user_profiles
            expect(mockDataAccess.insert).not.toHaveBeenCalled();
        });

        it('应该处理注册错误（邮箱已存在）', async () => {
            const email = 'existing@example.com';
            const password = 'password123';

            mockSupabaseClient.auth.signUp.mockResolvedValue({
                data: { user: null },
                error: { message: 'User already registered' },
            });

            const result: AuthResult = await authService.signUp(email, password);

            expect(result.success).toBe(false);
            expect(result.error).toBe('User already registered');
        });

        it('应该处理网络错误', async () => {
            const email = 'test@example.com';
            const password = 'password123';

            mockSupabaseClient.auth.signUp.mockRejectedValue(new Error('Network error'));

            const result: AuthResult = await authService.signUp(email, password);

            expect(result.success).toBe(false);
            expect(result.error).toBe('注册失败，请重试');
        });
    });

    describe('signIn - 用户登录', () => {
        it('应该成功登录并创建 user_profiles（首次登录）', async () => {
            const email = 'user@example.com';
            const password = 'password123';
            const mockUser = {
                id: 'user-123',
                email,
            };

            mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
                data: { user: mockUser },
                error: null,
            });

            // 第一次查询 user_profiles 返回空（不存在）
            mockDataAccess.select.mockResolvedValueOnce({
                data: [],
                error: null,
            });

            // 插入 user_profiles 成功
            mockDataAccess.insert.mockResolvedValueOnce({
                data: {
                    id: mockUser.id,
                    email: mockUser.email,
                    display_name: 'user',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                error: null,
            });

            const result: AuthResult = await authService.signIn(email, password);

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(mockDataAccess.select).toHaveBeenCalledWith(
                'user_profiles',
                '*',
                { id: mockUser.id }
            );
            expect(mockDataAccess.insert).toHaveBeenCalledWith(
                'user_profiles',
                expect.objectContaining({
                    id: mockUser.id,
                    email: mockUser.email,
                    display_name: 'user',
                })
            );
        });

        it('应该成功登录（user_profiles 已存在）', async () => {
            const email = 'user@example.com';
            const password = 'password123';
            const mockUser = {
                id: 'user-123',
                email,
            };

            mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
                data: { user: mockUser },
                error: null,
            });

            // user_profiles 已存在
            mockDataAccess.select.mockResolvedValueOnce({
                data: [{
                    id: mockUser.id,
                    email: mockUser.email,
                    display_name: 'Existing User',
                }],
                error: null,
            });

            const result: AuthResult = await authService.signIn(email, password);

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(mockDataAccess.insert).not.toHaveBeenCalled();
        });

        it('应该处理登录错误（密码错误）', async () => {
            const email = 'user@example.com';
            const password = 'wrongpassword';

            mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
                data: { user: null },
                error: { message: 'Invalid login credentials' },
            });

            const result: AuthResult = await authService.signIn(email, password);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid login credentials');
        });

        it('应该处理登录错误（用户不存在）', async () => {
            const email = 'nonexistent@example.com';
            const password = 'password123';

            mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
                data: { user: null },
                error: { message: 'Invalid login credentials' },
            });

            const result: AuthResult = await authService.signIn(email, password);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid login credentials');
        });
    });

    describe('signOut - 用户登出', () => {
        it('应该成功登出', async () => {
            mockSupabaseClient.auth.signOut.mockResolvedValue({
                error: null,
            });

            const result: AuthResult = await authService.signOut();

            expect(result.success).toBe(true);
            expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
        });

        it('应该处理登出错误', async () => {
            mockSupabaseClient.auth.signOut.mockResolvedValue({
                error: { message: 'Sign out failed' },
            });

            const result: AuthResult = await authService.signOut();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Sign out failed');
        });
    });

    describe('getCurrentUser - 获取当前用户', () => {
        it('应该成功获取当前用户', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'user@example.com',
            };

            mockSupabaseClient.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null,
            });

            const user = await authService.getCurrentUser();

            expect(user).toEqual(mockUser);
            expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
        });

        it('应该在未登录时返回 null', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const user = await authService.getCurrentUser();

            expect(user).toBeNull();
        });

        it('应该处理获取用户错误', async () => {
            mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Network error'));

            const user = await authService.getCurrentUser();

            expect(user).toBeNull();
        });
    });

    describe('signInWithOtp - 魔法链接登录', () => {
        it('应该成功发送魔法链接', async () => {
            const email = 'user@example.com';

            mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
                data: {},
                error: null,
            });

            const result: MagicLinkResult = await authService.signInWithOtp(email);

            expect(result.success).toBe(true);
            expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
                email,
                options: {
                    emailRedirectTo: expect.stringContaining('/auth/callback'),
                },
            });
        });

        it('应该处理发送魔法链接错误', async () => {
            const email = 'user@example.com';

            mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
                data: null,
                error: { message: 'Failed to send email' },
            });

            const result: MagicLinkResult = await authService.signInWithOtp(email);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to send email');
        });
    });

    describe('resetPassword - 密码重置', () => {
        it('应该成功发送密码重置邮件', async () => {
            const email = 'user@example.com';

            mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
                data: {},
                error: null,
            });

            const result: PasswordResetResult = await authService.resetPassword(email);

            expect(result.success).toBe(true);
            expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
                email,
                {
                    redirectTo: expect.stringContaining('/auth/reset-password'),
                }
            );
        });

        it('应该处理发送密码重置邮件错误', async () => {
            const email = 'user@example.com';

            mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
                data: null,
                error: { message: 'User not found' },
            });

            const result: PasswordResetResult = await authService.resetPassword(email);

            expect(result.success).toBe(false);
            expect(result.error).toBe('User not found');
        });
    });

    describe('updatePassword - 更新密码', () => {
        it('应该成功更新密码', async () => {
            const newPassword = 'newpassword123';
            const mockUser = {
                id: 'user-123',
                email: 'user@example.com',
            };

            mockSupabaseClient.auth.updateUser.mockResolvedValue({
                data: { user: mockUser },
                error: null,
            });

            const result: AuthResult = await authService.updatePassword(newPassword);

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
                password: newPassword,
            });
        });

        it('应该处理更新密码错误', async () => {
            const newPassword = 'newpassword123';

            mockSupabaseClient.auth.updateUser.mockResolvedValue({
                data: { user: null },
                error: { message: 'Password update failed' },
            });

            const result: AuthResult = await authService.updatePassword(newPassword);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Password update failed');
        });
    });

    describe('getUserProfile - 获取用户配置文件', () => {
        it('应该成功获取用户配置文件', async () => {
            const userId = 'user-123';
            const mockProfile = {
                id: userId,
                email: 'user@example.com',
                display_name: 'Test User',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            mockDataAccess.select.mockResolvedValue({
                data: [mockProfile],
                error: null,
            });

            const profile = await authService.getUserProfile(userId);

            expect(profile).toEqual(mockProfile);
            expect(mockDataAccess.select).toHaveBeenCalledWith(
                'user_profiles',
                '*',
                { id: userId }
            );
        });

        it('应该在配置文件不存在时返回 null', async () => {
            const userId = 'user-123';

            mockDataAccess.select.mockResolvedValue({
                data: [],
                error: null,
            });

            const profile = await authService.getUserProfile(userId);

            expect(profile).toBeNull();
        });

        it('应该处理查询错误', async () => {
            const userId = 'user-123';

            mockDataAccess.select.mockResolvedValue({
                data: null,
                error: new Error('Database error'),
            });

            const profile = await authService.getUserProfile(userId);

            expect(profile).toBeNull();
        });
    });

    describe('updateUserProfile - 更新用户配置文件', () => {
        it('应该成功更新用户配置文件', async () => {
            const userId = 'user-123';
            const updateData: Partial<UserProfile> = {
                display_name: 'Updated Name',
                avatar_url: 'https://example.com/avatar.jpg',
            };
            const updatedProfile: UserProfile = {
                id: userId,
                email: 'user@example.com',
                display_name: 'Updated Name',
                avatar_url: 'https://example.com/avatar.jpg',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            mockDataAccess.update.mockResolvedValue({
                data: updatedProfile,
                error: null,
            });

            const result = await authService.updateUserProfile(userId, updateData);

            expect(result).toEqual(updatedProfile);
            expect(mockDataAccess.update).toHaveBeenCalledWith(
                'user_profiles',
                expect.objectContaining({
                    ...updateData,
                    updated_at: expect.any(String),
                }),
                { id: userId }
            );
        });

        it('应该处理更新错误', async () => {
            const userId = 'user-123';
            const updateData = {
                display_name: 'Updated Name',
            };

            mockDataAccess.update.mockResolvedValue({
                data: null,
                error: new Error('Update failed'),
            });

            await expect(
                authService.updateUserProfile(userId, updateData)
            ).rejects.toThrow('Update failed');
        });
    });
});
