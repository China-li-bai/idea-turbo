/**
 * 订阅引导页 - 4页式"心甘情愿付费"设计
 * 
 * 设计哲学：理性与感性结合，技术硬核与情感共鸣并重
 * 架构原则：Linus×Jobs - 技术正确性 + 直觉设计
 * 技术栈：React 19 + shadcn UI + i18next + Tailwind CSS v4
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@make-gold/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Sparkles, Users, Zap, Lock, Brain, Globe, Smartphone } from 'lucide-react';
import { stripeService } from '@/services/StripeService';
import { SubscriptionPlan, PaymentMethod } from '@/types/subscription';
import './OnboardingAnimations.css';

// ===== 类型定义 & 接口 =====

interface OnboardingSlideProps {
  isActive: boolean;
  isVisible: boolean;
  direction: 'enter' | 'exit';
  children: React.ReactNode;
}

interface FeatureItemProps {
  icon: React.ReactNode;
  text: string;
  isAnimated?: boolean;
}

interface ConnectionDotProps {
  position: { x: number; y: number };
  isActive: boolean;
  delay?: number;
}

interface PricingCardProps {
  plan: SubscriptionPlan;
  isSelected: boolean;
  isPopular?: boolean;
  onClick: () => void;
  t: any;
}

// ===== 组件定义 =====

// 特性项组件
const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text, isAnimated = false }) => (
  <div className={cn(
    "flex items-center space-x-3 py-2 interactive-element",
    isAnimated && "feature-reveal animate-gpu"
  )}>
    <div className="flex-shrink-0 w-5 h-5 text-blue-400">
      {icon}
    </div>
    <span className="text-sm text-slate-300">{text}</span>
  </div>
);

// 连接点组件 - 为P2P连接动效
const ConnectionDot: React.FC<ConnectionDotProps> = ({ position, isActive, delay = 0 }) => (
  <div 
    className={cn(
      "absolute w-3 h-3 rounded-full transition-all duration-1000 animate-gpu",
      isActive ? "bg-white/80 shadow-lg connection-node" : "bg-white/30",
      isActive && "animate-pulse"
    )}
    style={{ 
      left: `${position.x}%`, 
      top: `${position.y}%`,
      animationDelay: `${delay}ms`
    }}
  />
);

// 幻灯片组件
const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ 
  isActive, 
  isVisible, 
  direction, 
  children 
}) => (
  <div className={cn(
    "absolute inset-0 flex flex-col items-center justify-center p-6 transition-all duration-700 ease-in-out onboarding-slide",
    isVisible ? "opacity-100 translate-x-0" : "opacity-0",
    !isActive && direction === 'exit' && "-translate-x-full",
    !isActive && direction === 'enter' && "translate-x-full"
  )}>
    {children}
  </div>
);

// 定价卡片组件
const PricingCard: React.FC<PricingCardProps> = ({ plan, isSelected, isPopular, onClick, t }) => (
  <Card className={cn(
    "relative p-6 cursor-pointer transition-all duration-300 border-2 pricing-card-hover animate-gpu",
    isSelected 
      ? "border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/20 pricing-card-selected" 
      : "border-slate-700 bg-slate-800/50 hover:border-slate-600",
    "backdrop-blur-sm"
  )} onClick={onClick}>
    {isPopular && (
      <Badge className={cn(
        "absolute -top-3 left-4 bg-yellow-500 text-black font-bold px-3 py-1 achievement-pop",
        isSelected && "animate-pulse"
      )}>
        {t('onboarding.slide4.plans.lifetime.badge')}
      </Badge>
    )}
    
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="font-bold text-lg text-white">{plan.name}</h3>
        <p className="text-sm text-slate-400 mt-1">{plan.description}</p>
      </div>
      <div className="text-right">
        <div className={cn(
          "text-2xl font-bold text-yellow-500",
          isSelected && "success-state"
        )}>
          {plan.price === 49 ? t('onboarding.slide4.plans.lifetime.price') : t('onboarding.slide4.plans.yearly.price')}
        </div>
        <div className="text-sm text-slate-400">
          {plan.price === 49 ? t('onboarding.slide4.plans.lifetime.period') : t('onboarding.slide4.plans.yearly.period')}
        </div>
      </div>
    </div>
    
    <div className="space-y-2">
      {plan.features.slice(0, 3).map((feature, index) => (
        <FeatureItem
          key={index}
          icon={<CheckCircle className="w-4 h-4" />}
          text={feature}
          isAnimated={isSelected}
        />
      ))}
    </div>
    
    {isSelected && (
      <div className="mt-4 pt-4 border-t border-slate-600 feature-reveal">
        <div className="flex items-center space-x-2 text-xs text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>{t('onboarding.slide4.cta.secondary')}</span>
        </div>
      </div>
    )}
  </Card>
);

// ===== 主组件 =====

export const SubscriptionOnboarding: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<'lifetime' | 'yearly'>('lifetime');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'enter' | 'exit'>('enter');
  const [connectionCount, setConnectionCount] = useState(0);

  // 订阅计划配置 - 从国际化文件形成
  const plans: Record<string, SubscriptionPlan> = {
    lifetime: {
      id: 'lifetime',
      name: t('onboarding.slide4.plans.lifetime.name'),
      description: t('onboarding.slide4.plans.lifetime.description'),
      type: 'premium' as any,
      price: 49,
      currency: 'USD',
      durationDays: -1, // 终身
      features: t('onboarding.slide4.plans.lifetime.features', { returnObjects: true }) as string[],
      isPopular: true,
      supportedPaymentMethods: [PaymentMethod.STRIPE]
    },
    yearly: {
      id: 'yearly', 
      name: t('onboarding.slide4.plans.yearly.name'),
      description: t('onboarding.slide4.plans.yearly.description'),
      type: 'premium' as any,
      price: 12,
      currency: 'USD',
      durationDays: 365,
      features: t('onboarding.slide4.plans.yearly.features', { returnObjects: true }) as string[],
      supportedPaymentMethods: [PaymentMethod.STRIPE]
    }
  };

  // 模拟P2P连接动效
  useEffect(() => {
    if (currentSlide === 1) {
      const interval = setInterval(() => {
        setConnectionCount(prev => {
          const newCount = Math.floor(Math.random() * 3) + 2;
          return newCount;
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentSlide]);

  // 监听Stripe支付成功和失败事件
  useEffect(() => {
    const handlePaymentSuccess = (event: CustomEvent) => {
      console.log('✅ Payment succeeded:', event.detail);
      setIsProcessingPayment(false);
      
      const { userId, planId } = event.detail;
      
      // 显示成功消息
      alert(`🎉 订阅成功！\n计划：${selectedPlan}\n用户：${userId}\n正在跳转到应用...`);
      
      // 延迟跳转，让用户看到成功消息
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    };

    const handlePaymentError = (event: CustomEvent) => {
      console.error('❌ Payment failed:', event.detail);
      setIsProcessingPayment(false);
      
      const { error } = event.detail;
      alert(`💥 订阅失败：${error}\n请重试或联系客服。`);
    };

    window.addEventListener('stripe-payment-success', handlePaymentSuccess as EventListener);
    window.addEventListener('stripe-payment-error', handlePaymentError as EventListener);
    
    return () => {
      window.removeEventListener('stripe-payment-success', handlePaymentSuccess as EventListener);
      window.removeEventListener('stripe-payment-error', handlePaymentError as EventListener);
    };
  }, [selectedPlan]);

  // 幻灯片导航逻辑
  const nextSlide = useCallback(() => {
    if (currentSlide < 3) {
      setSlideDirection('exit');
      setTimeout(() => {
        setCurrentSlide(currentSlide + 1);
        setSlideDirection('enter');
      }, 300);
    } else {
      handleStartSubscription();
    }
  }, [currentSlide]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setSlideDirection('exit');
      setTimeout(() => {
        setCurrentSlide(currentSlide - 1);
        setSlideDirection('enter');
      }, 300);
    }
  }, [currentSlide]);

  // 支付处理逻辑
  const handleStartSubscription = async () => {
    if (isProcessingPayment) return;
    
    setIsProcessingPayment(true);
    
    try {
      const plan = plans[selectedPlan];
      
      // 获取当前用户ID（实际应用中从认证上下文获取）
      const userId = 'd321d72c-71b7-4b29-ad3c-a400ef8b4415'; // 对应数据库中的实际用户ID
      
      // 创建Stripe结账会话
      const sessionId = await stripeService.createCheckoutSession(plan, userId);
      
      console.log('🛒 Stripe会话已创建:', sessionId);
      
      // 重定向到Stripe结账页面（测试模式会模拟）
      await stripeService.redirectToCheckout(sessionId);
      
    } catch (error) {
      console.error('Payment failed:', error);
      setIsProcessingPayment(false);
      alert('支付失败，请重试: ' + (error as Error).message);
    }
  };

  // ===== 渲染 =====
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      {/* 主容器 - 移动端全屏，桌面端响应式 */}
      <div className={cn(
        "relative w-full mx-auto",
        "sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl",
        "container-responsive"
      )}>
        <Card className={cn(
          "relative bg-black/90 backdrop-blur-xl border-slate-700 shadow-2xl shadow-black/50 min-h-screen sm:min-h-[700px]",
          "sm:rounded-[2.5rem] sm:p-1",
          "retina-shadow desktop-enhanced dark-theme-enhanced",
          "touch-target md:fine-pointer-precision"
        )}>
          {/* 状态栏 */}
          <div className="flex justify-between items-center px-6 py-4 text-white text-sm font-medium">
            <span>9:41</span>
            <div className="flex items-center space-x-1">
              <span>5G</span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-white rounded-full" />
                <div className="w-1 h-1 bg-white rounded-full" />
                <div className="w-1 h-1 bg-white/50 rounded-full" />
              </div>
            </div>
          </div>

          {/* 幻灯片容器 */}
          <div className={cn(
            "relative overflow-hidden flex-1 pb-20",
            "px-4 sm:px-6 onboarding-mobile portrait-optimized landscape-compact",
            "h-[600px] sm:h-[650px] lg:h-[700px]"
          )}>
            
            {/* Slide 1: 理性钩子 - 极致与掌控 */}
            <OnboardingSlide 
              isActive={currentSlide === 0} 
              isVisible={currentSlide === 0}
              direction={slideDirection}
            >
              <div className={cn(
                "text-center space-y-6 portrait-spacing mobile-spacing",
                "portrait-text-adjust landscape-text-compact"
              )}>
                {/* 视觉区域 */}
                <div className={cn(
                  "relative mx-auto mb-8",
                  "w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44",
                  "mobile-visual-area tablet-visual-area ultrawide-visual-area",
                  "landscape-visual-small portrait-visual-compact"
                )}>
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 brain-animation retina-optimized">
                    <div className="absolute inset-4 rounded-full border border-blue-400/50 orbit-animation" />
                    <div className="absolute inset-8 rounded-full border border-yellow-400/50 orbit-reverse-animation" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-4xl sm:text-5xl animate-gpu">🔒</div>
                    </div>
                  </div>
                </div>
                
                {/* 标签 */}
                <div className="flex justify-center space-x-2 mb-6 mobile-spacing">
                  <Badge variant="outline" className="border-blue-500/50 text-blue-400 bg-blue-500/10 text-xs sm:text-sm touch-target">
                    {t('onboarding.slide1.tag1')}
                  </Badge>
                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10 text-xs sm:text-sm touch-target">
                    {t('onboarding.slide1.tag2')}
                  </Badge>
                </div>
                
                {/* 标题和副标题 */}
                <div className="space-y-4">
                  <h1 
                    className={cn(
                      "font-bold text-white leading-tight",
                      "text-2xl sm:text-3xl md:text-4xl",
                      "mobile-text-size tablet-text-size"
                    )}
                    dangerouslySetInnerHTML={{ __html: t('onboarding.slide1.title') }}
                  />
                  <p 
                    className="text-slate-300 leading-relaxed text-sm sm:text-base"
                    dangerouslySetInnerHTML={{ __html: t('onboarding.slide1.subtitle') }}
                  />
                </div>
                
                {/* 特性列表 */}
                <div className={cn(
                  "space-y-3 mt-8 landscape-spacing-tight",
                  "sm:space-y-4"
                )}>
                  {(t('onboarding.slide1.features', { returnObjects: true }) as string[]).map((feature, index) => (
                    <FeatureItem
                      key={index}
                      icon={[<Brain className="w-4 h-4 sm:w-5 sm:h-5" />, <Zap className="w-4 h-4 sm:w-5 sm:h-5" />, <Lock className="w-4 h-4 sm:w-5 sm:h-5" />, <Globe className="w-4 h-4 sm:w-5 sm:h-5" />][index]}
                      text={feature}
                      isAnimated={currentSlide === 0}
                    />
                  ))}
                </div>
              </div>
            </OnboardingSlide>

            {/* Slide 2: 感性痛点 - 孤独与共鸣 */}
            <OnboardingSlide 
              isActive={currentSlide === 1} 
              isVisible={currentSlide === 1}
              direction={slideDirection}
            >
              <div className="text-center space-y-6">
                {/* P2P连接可视化 */}
                <div className={cn(
                  "relative mx-auto mb-8",
                  "w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72",
                  "mobile-connection-area tablet-connection-area ultrawide-connection-area"
                )}>
                  {/* 中心点（用户） */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg shadow-white/50 user-center z-10" />
                  
                  {/* 周围连接点 */}
                  <ConnectionDot position={{ x: 20, y: 25 }} isActive={connectionCount > 0} delay={0} />
                  <ConnectionDot position={{ x: 75, y: 20 }} isActive={connectionCount > 1} delay={500} />
                  <ConnectionDot position={{ x: 85, y: 70 }} isActive={connectionCount > 2} delay={1000} />
                  <ConnectionDot position={{ x: 15, y: 80 }} isActive={connectionCount > 0} delay={1500} />
                  
                  {/* 连接线动效 */}
                  {connectionCount > 0 && (
                    <svg className="absolute inset-0 w-full h-full">
                      <defs>
                        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: 'rgb(148, 163, 184)', stopOpacity: 0 }} />
                          <stop offset="50%" style={{ stopColor: 'rgb(148, 163, 184)', stopOpacity: 0.5 }} />
                          <stop offset="100%" style={{ stopColor: 'rgb(148, 163, 184)', stopOpacity: 0 }} />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M120 150 Q50 80 48 60" 
                        stroke="url(#connectionGradient)" 
                        strokeWidth="1" 
                        fill="none"
                        className="animate-pulse"
                      />
                      <path 
                        d="M120 150 Q180 50 180 48" 
                        stroke="url(#connectionGradient)" 
                        strokeWidth="1" 
                        fill="none"
                        className="animate-pulse"
                        style={{ animationDelay: '0.5s' }}
                      />
                    </svg>
                  )}
                </div>
                
                {/* 连接状态 */}
                <div className="text-xs text-blue-400 font-medium mb-6">
                  {t('onboarding.slide2.connectionStatus', { count: connectionCount })}
                </div>
                
                <div className="space-y-4">
                  <h1 
                    className="text-3xl font-bold text-white leading-tight"
                    dangerouslySetInnerHTML={{ __html: t('onboarding.slide2.title') }}
                  />
                  <p 
                    className="text-slate-300 leading-relaxed text-sm"
                    dangerouslySetInnerHTML={{ __html: t('onboarding.slide2.subtitle') }}
                  />
                </div>
                
                <div className="space-y-3 mt-8">
                  {(t('onboarding.slide2.features', { returnObjects: true }) as string[]).map((feature, index) => (
                    <FeatureItem
                      key={index}
                      icon={[<Users />, <Sparkles />, <Globe />, <CheckCircle />][index]}
                      text={feature}
                      isAnimated={currentSlide === 1}
                    />
                  ))}
                </div>
              </div>
            </OnboardingSlide>

            {/* Slide 3: 核心体验 - 同频与陪伴 */}
            <OnboardingSlide 
              isActive={currentSlide === 2} 
              isVisible={currentSlide === 2}
              direction={slideDirection}
            >
              <div className="text-center space-y-6">
                {/* 复习卡片界面模拟 */}
                <div className={cn(
                  "relative mx-auto mb-8",
                  "w-56 h-72 sm:w-64 sm:h-80 md:w-72 md:h-[22rem]",
                  "mobile-card-interface tablet-card-interface ultrawide-card-interface"
                )}>
                  {/* 成就Toast */}
                  <div className={cn(
                    "absolute -top-12 left-1/2 transform -translate-x-1/2 z-20 achievement-toast",
                    "bg-gradient-to-r from-yellow-500/90 to-orange-500/90 backdrop-blur-sm",
                    "px-4 py-2 rounded-full text-xs font-medium text-black",
                    "shadow-lg border border-yellow-400/50",
                    currentSlide === 2 && "achievement-pop"
                  )}>
                    {t('onboarding.slide3.achievementToast', { username: 'Alex', streak: 50 })}
                  </div>
                  
                  {/* 卡片界面 */}
                  <Card className="relative bg-slate-800/90 backdrop-blur-sm border-slate-600 h-full flex flex-col justify-center items-center p-6 animate-gpu">
                    {/* 光晕效果 */}
                    <div className={cn(
                      "absolute inset-0 rounded-lg border-2 border-yellow-500/0 transition-all duration-2000",
                      currentSlide === 2 && "border-yellow-500/60 shadow-lg shadow-yellow-500/30 focus-ring"
                    )} />
                    
                    {/* 卡片内容模拟 */}
                    <div className="space-y-4 w-full text-center">
                      <div className="h-4 bg-slate-600 rounded w-3/4 mx-auto animate-gpu" />
                      <div className="h-4 bg-slate-600 rounded w-1/2 mx-auto animate-gpu" />
                      <div className="h-4 bg-slate-600 rounded w-2/3 mx-auto animate-gpu" />
                    </div>
                    
                    {/* 按钮组 */}
                    <div className="flex space-x-3 mt-8">
                      <div className="w-8 h-8 bg-red-500 rounded opacity-60" />
                      <div className={cn(
                        "w-8 h-8 bg-green-500 rounded transition-all duration-500",
                        currentSlide === 2 && "button-success-feedback"
                      )} />
                    </div>
                    
                    {/* 脉冲指示器 */}
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-blue-400">
                      {currentSlide === 2 && (
                        <span className="loading-pulse">{t('onboarding.slide3.pulseIndicator')}</span>
                      )}
                    </div>
                  </Card>
                </div>
                
                <div className="space-y-4">
                  <h1 
                    className="text-3xl font-bold text-white leading-tight"
                    dangerouslySetInnerHTML={{ __html: t('onboarding.slide3.title') }}
                  />
                  <p 
                    className="text-slate-300 leading-relaxed text-sm"
                    dangerouslySetInnerHTML={{ __html: t('onboarding.slide3.subtitle') }}
                  />
                </div>
                
                <div className="space-y-3 mt-8">
                  {(t('onboarding.slide3.features', { returnObjects: true }) as string[]).map((feature, index) => (
                    <FeatureItem
                      key={index}
                      icon={[<Sparkles />, <Users />, <CheckCircle />, <Brain />][index]}
                      text={feature}
                      isAnimated={currentSlide === 2}
                    />
                  ))}
                </div>
              </div>
            </OnboardingSlide>

            {/* Slide 4: 转化与行动 - 承诺与契约 */}
            <OnboardingSlide 
              isActive={currentSlide === 3} 
              isVisible={currentSlide === 3}
              direction={slideDirection}
            >
              <div className="space-y-6">
                {/* 顶部图标 */}
                <div className="text-center mb-6">
                  <div className="text-4xl mb-4">🚀</div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    {t('onboarding.slide4.title')}
                  </h1>
                  <p className="text-slate-400 text-sm">
                    {t('onboarding.slide4.subtitle')}
                  </p>
                </div>
                
                {/* 价值主张 */}
                <div className="space-y-3 mb-6">
                  {(t('onboarding.slide4.valueProps', { returnObjects: true }) as string[]).map((prop, index) => (
                    <div 
                      key={index}
                      className="text-xs text-slate-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: prop }}
                    />
                  ))}
                </div>
                
                {/* 定价卡片 */}
                <div className={cn(
                  "space-y-3 sm:space-y-4 grid-responsive",
                  "touch-pricing-card"
                )}>
                  <PricingCard
                    plan={plans.lifetime}
                    isSelected={selectedPlan === 'lifetime'}
                    isPopular={true}
                    onClick={() => setSelectedPlan('lifetime')}
                    t={t}
                  />
                  
                  <PricingCard
                    plan={plans.yearly}
                    isSelected={selectedPlan === 'yearly'}
                    onClick={() => setSelectedPlan('yearly')}
                    t={t}
                  />
                </div>
              </div>
            </OnboardingSlide>

          </div>

          {/* 底部控制区 */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent",
            "p-4 sm:p-6 touch-target"
          )}>
            {/* 进度指示器 */}
            <div className="flex justify-center space-x-2 mb-4 sm:mb-6">
              {[0, 1, 2, 3].map(index => (
                <div 
                  key={index}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index === currentSlide 
                      ? "w-6 sm:w-8 bg-yellow-500" 
                      : "w-2 bg-slate-600"
                  )}
                />
              ))}
            </div>
            
            {/* 导航按钮 */}
            <div className="flex justify-between items-center">
              {currentSlide > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevSlide}
                  className={cn(
                    "text-slate-400 hover:text-white",
                    "touch-target fine-pointer-hover",
                    "text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3"
                  )}
                >
                  {t('onboarding.navigation.back')}
                </Button>
              )}
              
              <div className="flex-1" />
              
              <Button
                className={cn(
                  "font-bold rounded-full transition-all duration-300 interactive-element",
                  "px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base",
                  "touch-target touch-feedback fine-pointer-hover",
                  currentSlide === 3 
                    ? "cta-button-primary text-black shadow-lg shadow-yellow-500/30" 
                    : "bg-white text-black hover:bg-slate-100",
                  isProcessingPayment && "loading-pulse"
                )}
                onClick={nextSlide}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment 
                  ? t('onboarding.slide4.cta.processing')
                  : currentSlide === 3 
                    ? t('onboarding.slide4.cta.primary')
                    : t('onboarding.navigation.next')
                }
              </Button>
            </div>
            
            {/* 免费试用提示 */}
            {currentSlide === 3 && (
              <div className="text-center mt-4">
                <p className="text-xs text-slate-500">
                  {t('onboarding.slide4.cta.secondary')}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};