/**
 * Welcome Screen
 * 
 * First step of the onboarding process.
 * Refactored to use WelcomeScreenService for data access.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Globe, BrainCircuit, Settings, BarChart, User, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWelcomeScreenService, WelcomeProgress, WelcomeContent } from "@/services/WelcomeScreenService";
import { useAuth } from "@/contexts/AuthContext";

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const welcomeScreenService = getWelcomeScreenService();
  
  // 状态管理
  const [welcomeProgress, setWelcomeProgress] = useState<WelcomeProgress | null>(null);
  const [welcomeContent, setWelcomeContent] = useState<WelcomeContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 图标映射
  const iconMap: Record<string, React.ElementType> = {
    Book,
    Globe,
    BrainCircuit,
    Settings,
    BarChart,
    User,
    Target
  };
  
  // 加载欢迎屏幕内容和进度
  useEffect(() => {
    const loadWelcomeScreen = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // 获取或创建欢迎进度
        const progress = await welcomeScreenService.getOrCreateWelcomeProgress(user.id);
        setWelcomeProgress(progress);
        
        // 获取当前步骤的内容
        const content = welcomeScreenService.getWelcomeContent(progress.current_step);
        setWelcomeContent(content);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载欢迎屏幕失败');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWelcomeScreen();
  }, [user, welcomeScreenService]);
  
  // 处理"开始使用"按钮点击
  const handleGetStarted = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    try {
      // 移动到下一步
      const updatedProgress = await welcomeScreenService.moveToNextStep(user.id);
      setWelcomeProgress(updatedProgress);
      
      // 如果还有下一步，导航到下一步
      if (updatedProgress.current_step <= updatedProgress.total_steps) {
        // 这里可以导航到下一步的页面，暂时保持在同一页面
        const content = welcomeScreenService.getWelcomeContent(updatedProgress.current_step);
        setWelcomeContent(content);
      } else {
        // 完成欢迎流程，导航到主页面
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新进度失败');
    }
  };
  
  // 处理"登录"链接点击
  const handleSignIn = () => {
    navigate('/auth');
  };
  
  // 显示加载状态
  if (isLoading) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col font-display bg-background dark:bg-background">
        <div className="flex-grow flex flex-col justify-center px-4 pt-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
          <p className="text-center text-muted-foreground mt-4">加载中...</p>
        </div>
      </div>
    );
  }
  
  // 显示错误状态
  if (error || !welcomeContent) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col font-display bg-background dark:bg-background">
        <div className="flex-grow flex flex-col justify-center px-4 pt-12">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || '加载内容失败'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-white rounded-md"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col font-display bg-background dark:bg-background">
      <div className="flex-grow flex flex-col justify-center px-4 pt-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <BrainCircuit className="h-10 w-10 text-white" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-foreground">{welcomeContent.title}</h1>
            <p className="text-lg text-muted-foreground">{welcomeContent.subtitle}</p>
          </div>
          
          <div className="space-y-4 mb-8">
            {welcomeContent.features.map((feature, index) => {
              const IconComponent = iconMap[feature.icon] || Book;
              return (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
                  <div className="flex-shrink-0 mt-0.5">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-center mb-4">
            <div className="flex space-x-2">
              {Array.from({ length: welcomeProgress.total_steps }, (_, i) => i + 1).map((step) => (
                <div
                  key={step}
                  className={`h-2 w-2 rounded-full ${
                    step <= welcomeProgress.current_step ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            <Button 
              onClick={handleGetStarted} 
              className="w-full"
              size="lg"
            >
              {welcomeProgress.current_step < welcomeProgress.total_steps ? '下一步' : '开始使用'}
            </Button>
            
            {user ? (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/dashboard')}
              >
                跳过
              </Button>
            ) : (
              <div className="text-center">
                <span className="text-sm text-muted-foreground">
                  已有账号？{" "}
                  <button 
                    onClick={handleSignIn} 
                    className="text-primary hover:underline"
                  >
                    登录
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
