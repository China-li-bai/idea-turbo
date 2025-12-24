/**
 * 受保护路由组件 (Protected Route Component)
 * 
 * 遵循 Linus 编程哲学：
 * 1. 简单胜过复杂 - 单一职责：权限验证
 * 2. 无特殊情况 - 统一的权限判断逻辑
 * 3. 透明度 - 明确的重定向规则
 * 4. Never Break Userspace - 保持向下兼容
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

/**
 * 受保护路由组件
 * 
 * @param children 子组件
 * @param requireAuth 是否需要登录，默认为 true
 */
export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 加载中状态，避免闪烁
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  // 需要登录但用户未登录，重定向到登录页
  if (requireAuth && !user) {
    return <Navigate 
      to="/auth" 
      state={{ from: location }} 
      replace 
    />;
  }

  // 不需要登录或用户已登录，正常渲染
  return <>{children}</>;
}

/**
 * 公共路由组件（不需要登录）
 */
export function PublicRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute requireAuth={false}>{children}</ProtectedRoute>;
}

/**
 * 已登录用户重定向组件
 * 如果用户已登录访问登录页面，重定向到首页
 */
export function AuthRedirect({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  // 用户已登录，重定向到首页或来源页面
  if (user) {
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}